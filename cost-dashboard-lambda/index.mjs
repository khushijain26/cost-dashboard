import { CostExplorerClient, GetCostAndUsageCommand } from "@aws-sdk/client-cost-explorer";
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const costClient = new CostExplorerClient({ region: "us-east-1" });
const s3Client = new S3Client({ region: "us-east-1" });
const bedrockClient = new BedrockRuntimeClient({ region: "ap-south-1" });

const BUCKET_NAME = process.env.S3_BUCKET_NAME;
const ANOMALY_THRESHOLD = 0.2;

const toDateString = (date) => date.toISOString().split("T")[0];

const getLast30Days = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return { Start: toDateString(start), End: toDateString(end) };
};

const getLast60Days = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 60);
  return { Start: toDateString(start), End: toDateString(end) };
};

const getFromS3 = async (key) => {
  try {
    const command = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key });
    const response = await s3Client.send(command);
    const bodyString = await response.Body.transformToString();
    return JSON.parse(bodyString);
  } catch (err) {
    if (err.name === "NoSuchKey") return null;
    console.error("S3 getFromS3 error:", err);
    return null;
  }
};

const saveToS3 = async (key, data) => {
  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: JSON.stringify(data),
      ContentType: "application/json",
    });
    await s3Client.send(command);
    console.log(`Cached to S3: ${key}`);
  } catch (err) {
    console.error("S3 saveToS3 error:", err);
  }
};

const getCostData = async (dateRange) => {
  const command = new GetCostAndUsageCommand({
    TimePeriod: dateRange,
    Granularity: "DAILY",
    GroupBy: [{ Type: "DIMENSION", Key: "SERVICE" }],
    Metrics: ["UnblendedCost"],
  });
  const response = await costClient.send(command);
  return response.ResultsByTime;
};

const formatByService = (resultsByTime) => {
  const serviceTotals = {};
  for (const day of resultsByTime) {
    const date = day.TimePeriod.Start;
    for (const group of day.Groups) {
      const service = group.Keys[0];
      const amount = parseFloat(group.Metrics.UnblendedCost.Amount);
      if (!serviceTotals[service]) {
        serviceTotals[service] = { service, total: 0, daily: [] };
      }
      serviceTotals[service].total += amount;
      serviceTotals[service].daily.push({ date, amount });
    }
  }
  return Object.values(serviceTotals)
    .filter((s) => s.total > 0)
    .sort((a, b) => b.total - a.total)
    .map((s) => ({ ...s, total: parseFloat(s.total.toFixed(4)) }));
};

const detectAnomalies = (currentData, previousData) => {
  const anomalies = [];
  for (const curr of currentData) {
    const prev = previousData.find((s) => s.service === curr.service);
    if (!prev || prev.total === 0) continue;
    const deltaPercent = (curr.total - prev.total) / prev.total;
    if (deltaPercent > ANOMALY_THRESHOLD) {
      anomalies.push({
        service: curr.service,
        currentTotal: curr.total,
        previousTotal: prev.total,
        deltaPercent: parseFloat((deltaPercent * 100).toFixed(1)),
      });
    }
  }
  return anomalies.sort((a, b) => b.deltaPercent - a.deltaPercent);
};

// ─── Bedrock — Claude Haiku (uses Messages API format) ───────────────────────

const getClaudeExplanations = async (anomalies) => {
  const prompt = `You are an AWS cost analyst.
These AWS services had a cost spike of more than 20% compared to the previous period (in USD):

${JSON.stringify(anomalies, null, 2)}

For each service, write exactly one plain-English sentence explaining a likely cause
specific to that AWS service and the magnitude of the spike.
Return ONLY a valid JSON array with no extra text, markdown, or explanation:
[{"service":"...","reason":"..."}]`;

  const command = new InvokeModelCommand({
    modelId: "anthropic.claude-3-haiku-20240307-v1:0",
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify({
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 1000,
      temperature: 0.3,
      messages: [
        { role: "user", content: prompt }
      ],
    }),
  });

  const response = await bedrockClient.send(command);
  const responseBody = JSON.parse(Buffer.from(response.body).toString());
  const text = responseBody.content[0].text.trim();

  // Strip markdown code fences if model wraps the JSON
  const clean = text.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
  return JSON.parse(clean);
};

// ─── Response helper ──────────────────────────────────────────────────────────

const respond = (statusCode, body) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  },
  body: JSON.stringify(body),
});

// ─── Main handler ─────────────────────────────────────────────────────────────

export const handler = async (event) => {
  console.log("Event:", JSON.stringify(event));

  const method = event.requestContext?.http?.method || event.httpMethod;
  const path = (event.rawPath || event.requestContext?.http?.path || event.path || "")
    .replace(/^\/prod/, "");

  if (method === "OPTIONS") return respond(200, {});

  try {
    // ── GET /cost ─────────────────────────────────────────────────────────────
    if (method === "GET" && path === "/cost") {
      const today = toDateString(new Date());
      const cacheKey = `cost-${today}.json`;

      const cached = await getFromS3(cacheKey);
      if (cached) {
        console.log("Cache hit for", cacheKey);
        return respond(200, { source: "cache", data: cached });
      }

      console.log("Cache miss — fetching from Cost Explorer");
      const raw = await getCostData(getLast30Days());
      const formatted = formatByService(raw);
      await saveToS3(cacheKey, formatted);
      return respond(200, { source: "live", data: formatted });
    }

    // ── POST /anomaly ─────────────────────────────────────────────────────────
    if (method === "POST" && path === "/anomaly") {
      const body = JSON.parse(event.body || "{}");
      const currentData = body.currentData;

      if (!currentData || !Array.isArray(currentData)) {
        return respond(400, { error: "currentData array is required" });
      }

      // Accept previousData from request body if provided (useful for testing),
      // otherwise fall back to S3 cache, then fetch fresh from Cost Explorer.
      let previousData = body.previousData || await getFromS3("cost-previous-30d.json");

      if (!previousData) {
        console.log("No previous data — fetching last 60 days from Cost Explorer");
        const raw = await getCostData(getLast60Days());
        const splitPoint = Math.floor(raw.length / 2);
        previousData = formatByService(raw.slice(0, splitPoint));
        await saveToS3("cost-previous-30d.json", previousData);
      }

      const anomalies = detectAnomalies(currentData, previousData);
      console.log(`Detected ${anomalies.length} anomalies`);

      if (anomalies.length === 0) {
        return respond(200, { anomalies: [] });
      }

      let enriched;
      try {
        const explanations = await getClaudeExplanations(anomalies);
        enriched = anomalies.map((a) => ({
          ...a,
          reason: explanations.find((e) => e.service === a.service)?.reason
            ?? "No explanation available.",
        }));
      } catch (err) {
        // Graceful fallback — still return anomaly data even if Bedrock fails
        console.error("Bedrock error:", err.message);
        enriched = anomalies.map((a) => ({
          ...a,
          reason: "AI explanation temporarily unavailable.",
        }));
      }

      return respond(200, { anomalies: enriched });
    }

    return respond(404, { error: "Route not found" });

  } catch (err) {
    console.error("Handler error:", err);
    return respond(500, { error: "Internal server error", detail: err.message });
  }
};