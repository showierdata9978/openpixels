const express = require("express");
const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server);
const fs = require("fs");
const port = 3000;

let clients = [];
let usernames = [];
let chats = [];

let IDToClient = {};
alldata = JSON.parse(fs.readFileSync("./database.json"));
let currentid = 0;

/*
  TODO list:
    - Who placed what cell
    - Mod panel with passkey
    - Filter
    - No more then 2 clients per ip

  Mod panel:
    - Unhardcode passwords
    - Chat Moderation (Deletion)
    - Canvas Moderation (Fast Placing)
    - Reset/Change usernames
    - IP ban?
*/

let writelog = fs.readFileSync("./writes.txt");

function Log(Msg, id) {
  console.log(
    `[${Date.now().toLocaleString()}] [ID ${id}, USER: ${
      IDToClient[id].username
    }] ${Msg}`
  );
  writelog += `[${Date.now().toLocaleString()}] [ID ${id}, USER: ${
    IDToClient[id].username
  }] ${Msg}\n`;
}

function logWrite(msg) {
  console.log(`[${Date.now().toLocaleString()}] [System] ${msg}\n`);
  writelog += `[${Date.now().toLocaleString()}] [System] ${msg}\n`;
}

function writePixel(x, y, color, clientID) {
  if (!alldata.hasOwnProperty(x)) {
    alldata[x] = {};
  }
  alldata[x][y] = { color: color, author: IDToClient[clientID].username };
  ret = {};
  ret[x] = {}; // atomic view session chat
  ret[x][y] = alldata[x][y];
  return ret;
}

// Save The DB
setInterval(() => {
  fs.writeFileSync("./database.json", JSON.stringify(alldata));
  fs.writeFileSync("./writes.txt", writelog);
}, 60 * 1000);

process.on("beforeExit", () => {
  fs.writeFileSync("./database.json", JSON.stringify(alldata));
  fs.writeFileSync("./writes.txt", writelog);
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
    time: 60,
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
    if (scope != element.scope)
      if (!sockdata.hasOwnProperty(element.name)) {
        sockdata[element.name] = 0;
      }

    if (sockdata[element.name] > Date.now() * 1000 - element.time) {
      callback();
      sock.emit("alldata", alldata);
      sockdata.overruns++;

      // writelog("Rate limited!");

      if (sockdata.overruns >= 5) {
        logWrite("Spam detected! Automatically kicking...");
        sock.disconnect();
      }
    }
  });
  return;
}

io.on("connection", (socket) => {
  let cdata = new ClientData();

  cdata.overruns = 0;
  currentid++;
  cdata.username = "anon" + currentid;

  cdata.overruns = 0;
  cdata.id = currentid;
  let clientID = currentid;
  cdata.socket = socket;

  usernames.push(cdata.username);
  IDToClient[cdata.id] = cdata;

  cdata.overruns = 0;
  io.emit("username-add", cdata.username);
  socket.emit("usernames", usernames);

  socket.emit("alldata", alldata);
  socket.emit("anonname", cdata.username);
  socket.emit("get-chat", chats.slice(Math.max(chats.length - 5, 0)));

  clients.push(socket);

  Log("Connected!", cdata.id, cdata.username);

  logWrite(`Users active: ${clients.length} - ${usernames.join(", ")}`);

  socket.on("fill", (data) => {
    ratelimit(clientID, "fill", () => {
      Log("Filling too quickly!", cdata.id, cdata.username);
    });

    try {
      data = { x: data.x, y: data.y, color: data.color };

      io.emit("fill", writePixel(data.x, data.y, data.color, clientID));
    } catch (error) {
      Log("Fill error: " + error, cdata.id, cdata.username);
      socket.disconnect();
    }
    socket.cooldown = Date.now() * 1000;

    Log(`Filled pixel: ${JSON.stringify(data)}`, cdata.id, cdata.username);
  });

  socket.on("username", (data) => {
    ratelimit(clientID, "username", () => {
      Log("Changing usernames too quickly!", cdata.id, cdata.username);
    });

    try {
      if (data.name.includes("anon")) {
        socket.emit("serror", "Username not allowed!");
        return;
      } else if (data.name.trim().length > 15 || data.name.trim().length < 2) {
        socket.emit("serror", "Username length too long or short!");
        return;
      } else if (usernames.includes(data.name)) {
        socket.emit("serror", "Username already being used!");
        return;
      } else {
        if (!data.name.match("(/^[A-Za-z]+$/)")) {
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
        cdata.username_cd = Date.now() * 1000;
      }
    } catch (error) {
      Log("Username Error: " + error, cdata.id, cdata.username);
    }
  });

  socket.on("getusers", () => {
    ratelimit(clientID, "username", () => {
      Log("Fetching usernames too quickly!", cdata.id, cdata.username);
      // console.log(
      //   `ID: ${cdata.id}, USER: ${cdata.username} is getting usernames too quickly!`
      // );
      socket.emit("alldata", alldata);
    });

    socket.emit("usernames", usernames);
    cdata.username_cd = Date.now() * 1000;
  });

  socket.on("chat-message", (data) => {
    ratelimit(clientID, "chat", () => {
      socket.emit("alldata", alldata);
      Log("Chatting too quickly!", cdata.id, cdata.username);
      // console.log(
      //   `ID: ${cdata.id}, USER: ${cdata.username} is chatting too quickly!`
      // );
    });

    if (data.message.trim() == "") {
      socket.emit("serror", "Blank Message!");
      return;
    }

    chats.push({
      username: cdata.username,
      message: data.message,
    });

    io.emit("chat-message", {
      username: cdata.username,
      message: data.message,
    });
    socket.chat_cd = Date.now() * 1000;
    Log(`New message: "${data.message}"`, cdata.id, cdata.username);
  });

  socket.on("get-chat", (data) => {
    //io.emit("chats", chats);
    io.emit("chats", chats.slice(Math.max(chats.length - 10, 0)));
  });

  //TODO: Unhardcode password
  socket.on("senderror", (data) => {
    if (data.passkey == "eee") {
      IDToClient[data.client_id].socket.emit("error", data.message);
    }
  });

  //TODO: Unhardcode password
  socket.on("kick", (data) => {
    if (data.passkey == "eee") {
      let clientData = IDToClient[data.client_id];
      clientData.socket.disconnect();
    } else {
      logWrite(
        `!!! User attempted to use mod commands without authorization (kick) !!!`
      );
    }
  });

  socket.on("get-client-pairs", (data) => {
    if (data.passkey == "eee") {
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
  });

  socket.on("mod-change-username", (data) => {
    if (data.passkey == "eee") {
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
  });

  socket.on("disconnect", () => {
    Log("Disconnected!", cdata.id, cdata.username);
    usernames.splice(usernames.indexOf(cdata.username), 1);
    clients.splice(clients.indexOf(socket), 1);

    logWrite(`Users active: ${clients.length} - ${usernames.join(", ")}`);

    // console.log(`Users active: ${clients.length}`);
    // console.log(`User disconnected! (Username: ${cdata.username}) `);
    // console.log(usernames);

    io.emit("username-remove", cdata.username);
    delete IDToClient[clientID];
  });
});

app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.get("/oldcanvas", (req, res) => {
  res.sendFile(__dirname + "/oldcanvas.html");
});

server.listen(port, () => {
  logWrite(`Up and running at *:${port}!`);
});
