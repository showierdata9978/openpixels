const socket = io();

socket.on("connect", () => {
  console.log("Connected!");
  socket.emit("getusers");
});

const ctx = document.getElementById("canvas").getContext("2d");
const colors = [
  "red",
  "green",
  "blue",
  "orange",
  "cyan",
  "lime",
  "magenta",
  "yellow",
  "navy",
  "black",
];
let cooldown = 0;
let canvas = {};

// function generate() {
//   let ii = 0;
//   for (ii++; ii < 40; ) {
//     for (let i = 0; i < 40; ) {
//       let color = Math.floor(Math.random() * 11);
//       ctx.fillStyle = colors[color];
//       ctx.fillRect(i * 20, ii * 20, 20, 20);
//       i++;
//     }
//     ii++;
//   }
// }

let usernames = [];

let username;

socket.on("anonname", (data) => {
  username = data;
});

function navdisplay() {
  if (document.getElementById("displaylink").innerText == "Hide") {
    document.getElementById("top").setAttribute("style", "display: none;");
    document.getElementById("displaylink").innerText = "Show";
  } else {
    document.getElementById("top").setAttribute("style", "display: initial;");
    document.getElementById("displaylink").innerText = "Hide";
  }
}

document.getElementById("changename").onclick = () => {
  let username = document.getElementById("name").value;

  document.getElementById("name").value = "";

  localStorage.setItem("Username", username);

  socket.emit("username", { name: username });
};

document.getElementById("sendform").addEventListener("submit", (e) => {
  e.preventDefault();
  socket.emit("chat-message", {
    username: username,
    message: document.getElementById("messageinput").value,
  });

  document.getElementById("messageinput").value = "";
});

socket.on("chat-message", (data) => {
  let newmessage = document.createElement("li");
  newmessage.textContent = `${data.username}: ${data.message}`;
  document.getElementById("messagelist").prepend(newmessage);
});

socket.on("get-chat", (data) => {
  data.forEach((msg) => {
    let newmessage = document.createElement("li");
    newmessage.textContent = `${msg.username}: ${msg.message}`;
    document.getElementById("messagelist").prepend(newmessage);
  });
});

function singleCell(x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * 20, y * 20, 20, 20);
}

socket.on("fill", (data) => {
  Object.keys(data).forEach((x) => {
    Object.keys(data[x]).forEach((y) => {
      singleCell(x, y, data[x][y].color);
      if (!canvas.hasOwnProperty(x)) {
        canvas[x] = {};
      }
      canvas[x][y] = data[x][y];
    });
  });
});

socket.on("usernames", (data) => {
  usernames = data;

  document.getElementById(
    "ulist"
  ).textContent = `Users online: ${usernames.join(", ")}`;
});

socket.on("username-replace", (data) => {
  console.log(data);

  usernames[usernames.indexOf(data.before)] = data.after;

  document.getElementById(
    "ulist"
  ).textContent = `Users online: ${usernames.join(", ")}`;
});

socket.on("username-remove", (data) => {
  try {
    usernames.splice(usernames.indexOf(data), 1);
    document.getElementById(
      "ulist"
    ).textContent = `Users online: ${usernames.join(", ")}`;
  } catch (error) {}
});

socket.on("username-add", (data) => {
  try {
    usernames.push(data);
    document.getElementById(
      "ulist"
    ).textContent = `Users online: ${usernames.join(", ")}`;
  } catch (error) {}
});

socket.on("alldata", (data) => {
  console.log(data);
  canvas = data;
  Object.keys(data).forEach((x) => {
    Object.keys(data[x]).forEach((y) => {
      singleCell(x, y, data[x][y].color);
    });
  });
});

socket.on("disconnect", () => {
  document.body.innerHTML =
    "<h1>openpixels</h1> <p>Sorry, You have been kicked. This could be either from spamming, or a server shutdown. Thank you!</p>";
});

socket.on("serror", (data) => {
  console.log("server error:" + data);

  document.getElementById("serror").innerText = "Server Error(s): " + data;
  setTimeout(() => {
    document.getElementById("serror").innerText = " ";
  }, 8 * 1000);
});

document.getElementById("canvas").addEventListener("mousedown", (e) => {
  if (e.button != 0 || cooldown >= Date.now() - 400) {
    return;
  }
  cooldown = Date.now();
  let boundingrect = document.getElementById("canvas").getBoundingClientRect();
  console.log(boundingrect);
  let x = Math.floor(e.clientX - boundingrect.left);
  let y = Math.floor(e.clientY - boundingrect.top);

  // let color = Math.floor(Math.random() * 11);
  let color = document.getElementById("color").value;

  singleCell(Math.floor(x / 20), Math.floor(y / 20), color);

  let senddata = {
    x: Math.floor(x / 20),
    y: Math.floor(y / 20),
    color: color,
  };

  console.log(senddata.x, senddata.y, senddata.color);

  socket.emit("fill", senddata);
});

document.getElementById("canvas").addEventListener("contextmenu", (e) => {
  e.preventDefault();
  //showing usernames

  if (e.button != 0 || cooldown >= Date.now() - 400) {
    return;
  }
  cooldown = Date.now();
  let boundingrect = document.getElementById("canvas").getBoundingClientRect();
  console.log(boundingrect);
  let x = Math.floor(e.clientX - boundingrect.left);
  let y = Math.floor(e.clientY - boundingrect.top);

  Math.floor(x / 20), Math.floor(y / 20);

  alert();
});

setInterval(() => {
  if (cooldown >= Date.now() - 500) {
    document.getElementById("cooldown").innerText =
      "Wait 0.4 second(s) before painting!";
  } else {
    document.getElementById("cooldown").innerText = "";
  }
}, 250);

setTimeout(() => {
  const SavedUsername = localStorage.getItem("Username");
  if (SavedUsername) {
    console.log(SavedUsername);
    socket.emit("username", { name: SavedUsername });
  }
}, 300); // Because idk might help
