const express = require("express");
const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server);
const fs = require("fs");
const { Profanity, ProfanityOptions } = require("@2toad/profanity");
require("dotenv").config();

const filteroptions = new ProfanityOptions();
filteroptions.grawlix = "****";
const profanity = new Profanity(filteroptions);

const port = 3000;

let clients = [];
let usernames = [];
let chats = [];
let blacklist = ["zz"];

let IDToClient = {};
let currentid = 0;
let currentCHATID = 0;

/*
  TODO list:
    - Mod panel DONE
    - zooming (sorta done)  
*/

let alldata = JSON.parse(fs.readFileSync("./database.json"));
let banned = JSON.parse(fs.readFileSync("./banned.json"));
let writelog = fs.readFileSync("./writes.txt");

function formatCurrentDate() {
  var date = new Date();
  var hours = date.getHours();
  var minutes = date.getMinutes();
  var seconds = date.getSeconds();
  minutes = minutes < 10 ? "0" + minutes : minutes;
  var strTime = hours + ":" + minutes + ":" + seconds;
  return (
    date.getMonth() +
    1 +
    "/" +
    date.getDate() +
    "/" +
    date.getFullYear() +
    " " +
    strTime
  );
}

function Log(Msg, id) {
  console.log(
    `[${formatCurrentDate()}] [ID ${id}, USER: ${
      IDToClient[id].username
    }] ${Msg}`
  );
  writelog += `[${formatCurrentDate()}] [ID ${id}, USER: ${
    IDToClient[id].username
  }] ${Msg}\n`;
}

function logWrite(msg) {
  console.log(`[${formatCurrentDate()}] [System] ${msg}`);
  writelog += `[${formatCurrentDate()}] [System] ${msg}\n`;
}

function writePixel(x, y, color, clientID) {
  if (!alldata.hasOwnProperty(x)) {
    alldata[x] = {};
  }
  alldata[x][y] = { color: color, author: IDToClient[clientID].username };
  ret = {};
  ret[x] = {};
  ret[x][y] = alldata[x][y];
  return ret;
}

// Save The DB
setInterval(() => {
  fs.writeFileSync("./database.json", JSON.stringify(alldata));
  fs.writeFileSync("./writes.txt", writelog);
  fs.writeFileSync("./banned.json", JSON.stringify(banned));
}, 60 * 1000);

process.on("beforeExit", () => {
  fs.writeFileSync("./database.json", JSON.stringify(alldata));
  fs.writeFileSync("./writes.txt", writelog);
  fs.writeFileSync("./banned.json", JSON.stringify(banned));
});

class ClientData {
  /*
   * @type number
   */
  overruns = 0;

  /*
   *  @type number
   */
  id = 0;

  /*
   *  @type string
   */
  username = "anon(unknown ID)";

  /*
   * @type {import('socketio').socket}
   */
  socket = null;
}

const ratelimits = [
  {
    name: "fill",
    time: 0.25,
    scope: "fill",
  },
  {
    name: "username_cd",
    time: 0.5,
    scope: "username",
  },
  {
    name: "chat",
    time: 0.5,
    scope: "chat",
  },
];

function ratelimit(clientID, scope, callback) {
  let sockdata = IDToClient[clientID];
  let sock = sockdata.socket;
  if (scope == null) {
    scope = "fill";
  }

  ratelimits.forEach((element) => {
    if (scope != element.scope) {
      return;
    }
    // if no element then set to 0
    if (!sockdata.hasOwnProperty(element.name)) {
      sockdata[element.name] = 0;
    }
    // prettier-ignore
    if (sockdata[element.name] >= (Date.now() * 1000) - element.time) { 
      callback();
      sockdata.overruns++;

      if (sockdata.overruns >= 5) {
        logWrite("Spam detected! Automatically kicking...");
        sock.emit(
          "predisconnect",
          `Automod - You have been kicked for ${element.name} spamming. If you think this was by accident, please let us know.`
        );
        sock.disconnect();
      }
      throw "{Rate Limited}";
    }
  });
}

io.on("connection", (socket) => {
  if (banned[socket.handshake.headers["cf-connecting-ip"]]) {
    logWrite("IP banned user tried to connect! Kicking...");
    socket.emit(
      "predisconnect",
      banned[socket.handshake.headers["cf-connecting-ip"]]
    );
    socket.disconnect();
  } else {
    let cdata = new ClientData();

    currentid++;
    cdata.username = "anon" + currentid;
    cdata.overruns = 0;
    cdata.id = currentid;
    cdata.ip = socket.handshake.headers["cf-connecting-ip"];

    let clientID = currentid;
    cdata.socket = socket;

    usernames.push(cdata.username);
    IDToClient[cdata.id] = cdata;

    cdata.overruns = 0;
    io.emit("username-add", cdata.username);
    socket.emit("usernames", usernames);

    socket.emit("alldata", alldata);
    socket.emit("anonname", cdata.username);
    socket.emit("get-chat", chats);

    clients.push(socket);

    Log("Connected!", cdata.id, cdata.username);

    logWrite(`Users active: ${clients.length} - ${usernames.join(", ")}`);

    socket.on("fill", (data) => {
      try {
        ratelimit(clientID, "fill", () => {
          Log("Filling too quickly!", cdata.id, cdata.username);
          ret = {};
          ret[data.x] = {};
          ret[data.x][data.y] = alldata[data.x][data.y];
          socket.emit("fill", ret);
        });

        Log(`Filled pixel: ${JSON.stringify(data)}`, cdata.id, cdata.username);
        data = { x: data.x, y: data.y, color: data.color };
        io.emit("fill", writePixel(data.x, data.y, data.color, clientID));

        cdata.fill = Date.now() * 1000;
      } catch (e) {}
    });

    socket.on("username", (data) => {
      try {
        ratelimit(clientID, "username", () => {
          Log("Changing usernames too quickly!", cdata.id, cdata.username);
        });

        if (data.name.includes("anon")) {
          socket.emit("serror", "Username not allowed!");
          return;
        } else if (
          data.name.trim().length > 15 ||
          data.name.trim().length < 2
        ) {
          socket.emit("serror", "Username length too long or short!");
          return;
        } else if (usernames.includes(data.name)) {
          socket.emit("serror", "Username already being used!");
          return;
        } else if (blacklist.includes(data.name)) {
          banned[
            socket.handshake.headers["cf-connecting-ip"]
          ] = `Automod - You have been banned because your username (${data.name}) is on a blacklist. This has probably occurred due to you breaking a rule!`;
          fs.writeFileSync("./banned.json", JSON.stringify(banned));
          socket.emit(
            "predisconnect",
            `Automod - You have been banned because your username (${data.name}) is on a blacklist. This has probably occurred due to you breaking a rule!`
          );
          return;
        } else {
          data.name = profanity.censor(data.name);

          if (!data.name.match(/^[\u0020-\u007e\u00a0-\u00ff]*$/)) {
            socket.emit("serror", "Char in username is not legal");
            return;
          }

          io.emit("username-replace", {
            before: cdata.username,
            after: data.name,
          });
          usernames[usernames.indexOf(cdata.username)] = data.name;
          Log(`Set new username: ${data.name}`, cdata.id, cdata.username);
          cdata.username = data.name;
        }

        cdata.username_cd = Date.now() * 1000;
      } catch (e) {}
    });

    socket.on("getusers", () => {
      socket.emit("usernames", usernames);
    });

    socket.on("mod-del-chat-message", (data) => {
      if (data.passkey == process.env.passkey) {
        chats[data.id] = {
          username: "",
          message: "",
          id: data.id,
        };
        io.emit("remove-chat-msg", chats[data.id]);
      }
    });

    socket.on("chat-message", (data) => {
      try {
        ratelimit(clientID, "chat", () => {
          Log("Chatting too quickly!", cdata.id, cdata.username);
        });

        if (data.message.trim() == "") {
          socket.emit("serror", "Blank Message!");
          return;
        }

        data.message = profanity.censor(data.message);
        chats.push({
          username: cdata.username,
          message: data.message,
          id: currentCHATID,
        });

        io.emit("chat-message", {
          username: cdata.username,
          message: data.message,
          id: currentCHATID,
        });

        currentCHATID++;
        Log(`New message: "${data.message}"`, cdata.id, cdata.username);

        cdata.chat = Date.now() * 1000;
      } catch (e) {}
    });

    socket.on("get-chat", (data) => {
      socket.emit("chats", chats.slice(Math.max(chats.length - 50, 0)));
    });

    socket.on("get-canvas", (data) => {
      socket.emit("alldata", alldata);
    });

    socket.on("senderror", (data) => {
      if (data.passkey == process.env.passkey) {
        try {
          IDToClient[data.client_id].socket.emit("serror", data.message);
        } catch (e) {
          socket.emit("serror", "bad socket ID");
        }
      }
    });

    socket.on("kick", (data) => {
      try {
        if (data.passkey == process.env.passkey) {
          try {
            let clientData = IDToClient[data.client_id];
            if (data.reason) {
              clientData.socket.emit("predisconnect", data.reason);
            }
            clientData.socket.disconnect();
          } catch (e) {
            socket.emit("serror", "bad socket ID");
          }
        } else {
          // clientData.socket.disconnect doesnt work either
          logWrite(
            `!!! User attempted to use mod commands without authorization (kick) !!!`
          );
        }
      } catch {
        socket.emit("serror", "failed to kick");
      }
    });

    socket.on("ban", (data) => {
      try {
        if (data.passkey == process.env.passkey) {
          try {
            let clientData = IDToClient[data.client_id];
            if (data.reason) {
              banned[socket.handshake.headers["cf-connecting-ip"]] =
                data.reason;
              fs.writeFileSync("./banned.json", JSON.stringify(banned));
              clientData.socket.emit("predisconnect", data.reason);
            }
            clientData.socket.disconnect();
          } catch (e) {
            socket.emit("serror", "bad socket ID");
          }
        } else {
          // clientData.socket.disconnect doesnt work either
          logWrite(
            `!!! User attempted to use mod commands without authorization (ban) !!!`
          );
        }
      } catch {
        socket.emit("serror", "failed to ban");
      }
    });

    socket.on("get-client-pairs", (data) => {
      try {
        if (data.passkey == process.env.passkey) {
          ret = {};
          Object.values(IDToClient).forEach((e) => {
            ret[e.username] = e.id;
          });

          socket.emit("get-client-pairs", ret);
        } else {
          logWrite(
            `!!! User attempted to use mod commands without authorization (get-client-pairs) !!!`
          );
        }
      } catch {
        socket.emit("serror", "failed to get-client-pairs");
      }
    });

    socket.on("mod-change-username", (data) => {
      try {
        if (data.passkey == process.env.passkey) {
          let client = IDToClient[data.client_id];

          io.emit("username-replace", {
            before: client.username,
            after: data.newname,
          });
          usernames[usernames.indexOf(client.username)] = data.newname;
          logWrite(
            `Mod changed a user's username from: ${client.username} to ${data.newname}`
          );
          client.username = data.newname;
        } else {
          logWrite(
            `!!! User attempted to use mod commands without authorization (mod-change-username) !!!`
          );
        }
      } catch {
        socket.emit("serror", "bad socket ID");
      }
    });

    socket.on("mod-reset-username", (data) => {
      try {
        if (data.passkey == process.env.passkey) {
          let client = IDToClient[data.client_id];
          let uname = "anon" + data.client_id;

          io.emit("username-replace", {
            before: client.username,
            after: uname,
          });
          usernames[usernames.indexOf(client.username)] = uname;
          logWrite(`Mod reset the username of CID #${data.client_id}`);
          client.username = uname;
        } else {
          logWrite(
            `!!! User attempted to use mod commands without authorization (mod-change-username) !!!`
          );
        }
      } catch (error) {
        socket.emit("serror", "bad socket ID");
      }
    });

    socket.on("disconnect", () => {
      Log("Disconnected!", cdata.id, cdata.username);
      usernames.splice(usernames.indexOf(cdata.username), 1);
      clients.splice(clients.indexOf(socket), 1);

      logWrite(`Users active: ${clients.length} - ${usernames.join(", ")}`);

      io.emit("username-remove", cdata.username);
      delete IDToClient[clientID];
    });
  }
});

app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.get("/oldcanvas", (req, res) => {
  res.sendFile(__dirname + "/public/oldcanvas.html");
});

app.get("/rules", (req, res) => {
  res.sendFile(__dirname + "/public/rules.html");
});

app.get("/credits", (req, res) => {
  res.sendFile(__dirname + "/public/credits.html");
});

server.listen(port, () => {
  logWrite(`Up and running at *:${port}!`);
});
