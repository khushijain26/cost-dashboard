export const mockCostData = [
  { service: "EC2",         thisWeek: 142.50, lastWeek: 98.20  },
  { service: "Lambda",      thisWeek: 12.40,  lastWeek: 11.80  },
  { service: "S3",          thisWeek: 8.90,   lastWeek: 8.50   },
  { service: "RDS",         thisWeek: 210.00, lastWeek: 130.00 },
  { service: "CloudFront",  thisWeek: 5.20,   lastWeek: 5.00   },
  { service: "API Gateway", thisWeek: 3.10,   lastWeek: 2.90   },
];

export const mockAnomalies = [
  {
    service: "EC2",
    thisWeek: 142.50, lastWeek: 98.20, delta: 45.2,
    reason: "Likely caused by an auto-scaling event — EC2 spun up extra instances to handle a traffic spike and may not have scaled back down."
  },
  {
    service: "RDS",
    thisWeek: 210.00, lastWeek: 130.00, delta: 61.5,
    reason: "A large RDS increase often indicates a Multi-AZ failover, increased storage I/O, or a long-running query preventing read replica sync."
  }
];