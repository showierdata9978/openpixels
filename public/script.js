const canvasElm = document.getElementById("canvas");
const displayLink = document.getElementById("displaylink");
const topElement = document.getElementById("top");
const nameElement = document.getElementById("name");
const messageList = document.getElementById("messagelist");
const messageInput = document.getElementById("messageinput");
const ulist = document.getElementById("ulist");
const serror = document.getElementById("serror");
const changeName = document.getElementById("changename");
const socket = io();

socket.on("connect", () => {
  console.log("Connected!");
  socket.emit("getusers");
});

const ctx = canvasElm.getContext("2d");
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
  if (displayLink.innerText == "Hide") {
    topElement.setAttribute("style", "display: none;");
    displayLink.innerText = "Show";
  } else {
    topElement.setAttribute("style", "display: initial;");
    displayLink.innerText = "Hide";
  }
}

changeName.onclick = () => {
  let username = nameElement.value;

  nameElement.value = "";

  localStorage.setItem("Username", username);

  socket.emit("username", { name: username });
};

document.getElementById("sendform").addEventListener("submit", (e) => {
  e.preventDefault();
  socket.emit("chat-message", {
    username: username,
    message: messageInput.value,
  });

  messageInput.value = "";
});

socket.on("chat-message", (data) => {
  let newmessage = document.createElement("li");
  newmessage.textContent = `${data.username}: ${data.message}`;
  messageList.prepend(newmessage);
});

socket.on("get-chat", (data) => {
  data.forEach((msg) => {
    let newmessage = document.createElement("li");
    newmessage.textContent = `${msg.username}: ${msg.message}`;
    messageList.prepend(newmessage);
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

  ulist.textContent = `Users online: ${usernames.join(", ")}`;
});

socket.on("username-replace", (data) => {
  console.log(data);

  usernames[usernames.indexOf(data.before)] = data.after;

  ulist.textContent = `Users online: ${usernames.join(", ")}`;
});

socket.on("username-remove", (data) => {
  try {
    usernames.splice(usernames.indexOf(data), 1);
    ulist.textContent = `Users online: ${usernames.join(", ")}`;
  } catch (error) {}
});

socket.on("username-add", (data) => {
  try {
    usernames.push(data);
    ulist.textContent = `Users online: ${usernames.join(", ")}`;
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

  serror.innerText = "Server Error(s): " + data;
  setTimeout(() => {
    serror.innerText = " ";
  }, 8 * 1000);
});

canvasElm.addEventListener("mousedown", (e) => {
  if (e.button != 0 || cooldown >= Date.now() - 400) {
    return;
  }
  cooldown = Date.now();
  let boundingrect = canvasElm.getBoundingClientRect();
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
canvasElm.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  //showing usernames

  let boundingrect = canvasElm.getBoundingClientRect();
  console.log(boundingrect);
  let x = Math.floor(e.clientX - boundingrect.left);
  let y = Math.floor(e.clientY - boundingrect.top);

  try {
    console.log(canvas[Math.floor(x / 20)][Math.floor(y / 20)].author);
    document.getElementById("selectedauthor").textContent = `Filled by ${
      canvas[Math.floor(x / 20)][Math.floor(y / 20)].author
    }`;
  } catch (_) {
    document.getElementById("selectedauthor").textContent = `Filled by nobody`;
    let authorstyle = document.getElementById("authordiv").style;
    authorstyle.position = "absolute";
    authorstyle.left = x + 20 + "px";
    authorstyle.top = y + 20 + "px";
  }

  // let color = canvas[Math.floor(x / 20)][Math.floor(y / 20)].color;
  ctx.strokeStyle = "#000000";
  ctx.strokeRect(Math.floor(x / 20) * 20, Math.floor(y / 20) * 20, 20, 20);

  let authorstyle = document.getElementById("authordiv").style;
  authorstyle.position = "absolute";
  authorstyle.left = x + 20 + "px";
  authorstyle.top = y + 20 + "px";

  setTimeout(() => {
    document.getElementById("selectedauthor").textContent = ``;
    authorstyle.left = 0;
    authorstyle.top = 0;
    ctx.clearRect(0, 0, canvasElm.width, canvasElm.height);
    Object.keys(canvas).forEach((x) => {
      Object.keys(canvas[x]).forEach((y) => {
        singleCell(x, y, canvas[x][y].color);
      });
    });
  }, 2000);
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
