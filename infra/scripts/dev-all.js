const { spawn } = require("child_process");

const dev = spawn("npm", ["run", "dev"], { stdio: "inherit" });

function runPostdev() {
  const postDev = spawn("npm", ["run", "postdev"], { stdio: "inherit" });
  postDev.on("close", () => process.exit(0));
}

dev.on("close", runPostdev);
process.on("SIGINT", runPostdev);
