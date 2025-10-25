const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");

async function run() {
  const apiUrl = process.env.API_URL || "http://localhost:4000";
  const fixture = path.join(__dirname, "fixtures", "test.pdf");
  if (!fs.existsSync(fixture)) {
    fs.writeFileSync(fixture, "This is a test PDF placeholder\n", "utf8");
  }

  console.log("Requesting presigned upload URL...");
  const res = await fetch(apiUrl + "/uploads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: "test.pdf", projectId: "e2e-demo", contentType: "application/pdf" }),
  });
  if (!res.ok) {
    console.error("POST /uploads failed", await res.text());
    process.exit(2);
  }
  const payload = await res.json();
  console.log("Received:", payload);

  console.log("Uploading fixture to presigned URL...");
  const fileStream = fs.createReadStream(fixture);
  const putRes = await fetch(payload.url, { method: "PUT", body: fileStream, headers: { "Content-Type": "application/pdf" } });
  if (!(putRes.ok || putRes.status === 200 || putRes.status === 201)) {
    console.error("PUT to presigned URL failed", putRes.status, await putRes.text());
    process.exit(3);
  }
  console.log("Upload complete. Verifying metadata...");

  // Wait briefly for metadata append (worker may process separately).
  await new Promise((r) => setTimeout(r, 1500));

  const metaPath = path.join(__dirname, "..", "data", "evidence.jsonl");
  if (!fs.existsSync(metaPath)) {
    console.error("Metadata file not found:", metaPath);
    process.exit(4);
  }
  const lines = fs.readFileSync(metaPath, "utf8").trim().split("\n").filter(Boolean);
  const found = lines.map(l=>JSON.parse(l)).find(r=>r.id === payload.uploadId || r.objectKey === payload.objectKey);
  if (!found) {
    console.error("Metadata entry not found for uploadId/objectKey. Last lines:", lines.slice(-5));
    process.exit(5);
  }
  console.log("Metadata entry found:", found);
  console.log("E2E test passed (upload -> metadata). Note: worker processing (checksum/index) is separate.");
  process.exit(0);
}

run().catch(e=>{
  console.error("E2E runner error:", e);
  process.exit(1);
});
