const { S3Client, CreateBucketCommand } = require("@aws-sdk/client-s3");

async function main() {
  const endpoint = process.env.AWS_ENDPOINT || "http://localhost:9000";
  const bucket = process.env.S3_BUCKET || "local-minio-bucket";
  const client = new S3Client({
    region: "us-west-2",
    endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || "minioadmin",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "minioadmin"
    }
  });

  try {
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
    console.log("Created bucket", bucket, "at", endpoint);
  } catch (err) {
    console.error("CreateBucket failed:", err && err.message ? err.message : err);
    process.exit(2);
  }
}

main();
