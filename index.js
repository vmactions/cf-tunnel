const core = require('@actions/core');
const exec = require('@actions/exec');
const tc = require('@actions/tool-cache');
const io = require('@actions/io');
const fs = require("fs");
const path = require("path");
const os = require("os");


async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}


async function download() {
  NGROK_MAC = "https://bin.equinox.io/c/VdrWdbjqyF/cloudflared-stable-darwin-amd64.zip"
  NGROK_Linux = "https://bin.equinox.io/c/VdrWdbjqyF/cloudflared-stable-linux-amd64.tgz"
  NGROK_Win = "https://bin.equinox.io/c/VdrWdbjqyF/cloudflared-stable-windows-amd64.zip"


  let link = NGROK_Win;
  if (os.platform() == "darwin") {
    link = NGROK_MAC;
  } else if (os.platform() == "linux") {
    link = NGROK_Linux;
  }


  let workingDir = __dirname;
  {
    core.info("Downloading: " + link);
    let img = await tc.downloadTool(link);
    core.info("Downloaded file: " + img);
    await io.mv(img, path.join(workingDir, "./cf.tgz"));

  }

  await exec.exec("tar -xzf " + path.join(workingDir, "./cf.tgz"));


}

async function run(token, protocol, port) {
  let workingDir = __dirname;

  let ngrok = path.join(workingDir, "./cloudflared")
  if (os.platform() == "win32") {
    ngrok += ".exe";
  }

  let log = path.join(workingDir, "./cf.log");

  await exec.exec("sh", [], { input: `${ngrok} tunnel --url ${protocol}://localhost:${port} >$ng_temp_1 2>&1 &` });

  await sleep(5000);


  let output = "";
  await exec.exec("sh", [], {
    input: `cat "${log}" | grep https:// | grep trycloudflare.com | head -1 | cut -d '|' -f 2 | tr -d ' ' | cut -d '/' -f 3`,
    listeners: {
      stdout: (s) => {
        output += s;
        core.info(s);
      }
    }
  });

  let lines = output.split('//');
  let server = lines[lines.length - 1];
  core.info("server: " + server);
  core.setOutput("server", server);

}



async function main() {

  let protocol = core.getInput("protocol");
  core.info("protocol: " + protocol);
  if (!protocol) {
    protocol = "tcp";
  }

  let port = core.getInput("port");
  core.info("port: " + port);
  if (!port) {
    core.setFailed("No port !");
    return;
  }


  var envs = core.getInput("envs");
  console.log("envs:" + envs);
  if (envs) {
    fs.appendFileSync(path.join(process.env["HOME"], "/.ssh/config"), "SendEnv " + envs + "\n");
  }

  await download();

  await run(token, protocol, port);


  process.exit();
}



main().catch(ex => {
  core.setFailed(ex.message);
});

