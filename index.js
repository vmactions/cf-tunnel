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
  NGROK_MAC   = "https://github.com/cloudflare/cloudflared/releases/download/2022.10.3/cloudflared-darwin-amd64.tgz"
  NGROK_Linux = "https://github.com/cloudflare/cloudflared/releases/download/2022.10.3/cloudflared-linux-amd64"
  NGROK_Win   = "https://github.com/cloudflare/cloudflared/releases/download/2022.10.3/cloudflared-windows-amd64.exe"


  let link = NGROK_Win;
  let ext = "";
  if (os.platform() == "darwin") {
    link = NGROK_MAC;
    ext = "tgz";
  } else if (os.platform() == "linux") {
    link = NGROK_Linux;
  }


  let workingDir = __dirname;
  {
    core.info("Downloading: " + link);
    let img = await tc.downloadTool(link);
    core.info("Downloaded file: " + img);
    
    if (os.platform() == "darwin") {
      await io.mv(img, path.join(workingDir, "./cf." + ext));
      await exec.exec("tar -xzf " + path.join(workingDir, "./cf." + ext));
      await io.mv("cloudflared", path.join(workingDir, "cloudflared"));
    } else if (os.platform() == "linux") {
      await io.mv(img, path.join(workingDir, "./cloudflared"));
      await exec.exec("sh", [], { input: "chmod +x " +  path.join(workingDir, "./cloudflared")});
    } else {
      await io.mv(img, path.join(workingDir, "./cloudflared.exe"));
    }
  
  

  }

//  if (ext === "tgz") {
//    await exec.exec("tar -xzf " + path.join(workingDir, "./cf." + ext));
//    await io.mv("cloudflared", path.join(workingDir, "cloudflared"));
//  } else if (link === NGROK_MAC) {
//    await exec.exec("7za e -y " + path.join(workingDir, "./cf." + ext) + "  -o" + workingDir);
//  } else {
//    await exec.exec("unzip " + path.join(workingDir, "./cf." + ext) + "  -d " + workingDir);
//  }

}

async function run(protocol, port) {
  let workingDir = __dirname;

  let cfd = path.join(workingDir, "./cloudflared");
  let log = path.join(workingDir, "./cf.log");
  if (os.platform() == "win32") {
    cfd += ".exe";
    cfd = cfd.replace(/^(\w):|\\+/g,'/$1');
    log = log.replace(/^(\w):|\\+/g,'/$1');
  }

  await exec.exec("sh", [], { input: `if ! ${cfd} update; then echo ok;fi` });
  await exec.exec("sh", [], { input: `${cfd} tunnel --url ${protocol}://localhost:${port} >${log} 2>&1 &` });


  for (let i = 0; i < 10; i++) {
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
    let server = output;//lines[lines.length - 1];
    if (!server) {
      continue;
    }
    core.info("server: " + server);
    await exec.exec("sh", [], { input: `echo "server=${server}" >> $GITHUB_OUTPUT` });

    break;
  }


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


  await download();

  await run(protocol, port);


  process.exit();
}



main().catch(ex => {
  core.setFailed(ex.message);
});

