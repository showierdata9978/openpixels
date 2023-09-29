const socket = io(document.location.origin);
const messageList = document.getElementById("messagelist");
const messageInput = document.getElementById("messageinput");

let cid = document.getElementById("cid");

/*
  Mod Panel TODO:
    - Fast Placing
*/

socket.on("connect", () => {
  console.log("Connected!");
});

let kickreason = "No Reason Given.";

socket.on("predisconnect", (data) => {
  kickreason = data;
});

let password = "eee";

document.getElementById("password").addEventListener("submit", (e) => {
  e.preventDefault();

  password = document.getElementById("password2").value;

  document.getElementById("password2").value = "";
  socket.emit("get-client-pairs", { passkey: password });
});

document.getElementById("resetname").addEventListener("click", (e) => {
  console.log(cid);

  socket.emit("mod-reset-username", {
    passkey: password,
    client_id: parseInt(cid.value),
  });
});

socket.on("chat-message", (data) => {
  let newmessage = document.createElement("li");
  newmessage.id = "msg-" + data.id;
  newmessage.textContent = `${data.username}: ${data.message} (ID: ${data.id})`;
  messageList.prepend(newmessage);
});

document.getElementById("delchat").addEventListener("submit", (e) => {
  e.preventDefault();
  socket.emit("mod-del-chat-message", {
    id: parseInt(document.getElementById("chatid").value),
    passkey: password,
  });
});

// socket.on("remove-chat-msg", (data) => {
//   try {
//     document.getElementById("msg-" + data.id).remove();
//   } catch (error) {
//     console.log("Error removing ID " + data.id);
//   }
// });

socket.on("get-chat", (data) => {
  data.forEach((msg) => {
    if (msg.username != "") {
      let newmessage = document.createElement("li");
      newmessage.id = "msg-" + msg.id;
      newmessage.textContent = `${msg.username}: ${msg.message} (ID: ${msg.id})`;
      messageList.prepend(newmessage);
    }
  });
});

document.getElementById("chatform").addEventListener("submit", (e) => {
  e.preventDefault();
  socket.emit("chat-message", {
    username: "mod",
    message: messageInput.value,
  });

  messageInput.value = "";
});

document.getElementById("ChangeUName").addEventListener("submit", (e) => {
  e.preventDefault();

  console.log(cid);

  socket.emit("mod-change-username", {
    passkey: password,
    client_id: parseInt(cid.value),
    newname: document.getElementById("newusername").value,
  });
});

socket.on("get-client-pairs", (data) => {
  document.getElementById("pairs").innerText =
    "Client IDs TO Usernames: " + JSON.stringify(data);
});

socket.on("username-replace", (data) => {
  if (password != "eee") {
    socket.emit("get-client-pairs", { passkey: password });
  }
});
socket.on("username-remove", (data) => {
  if (password != "eee") {
    socket.emit("get-client-pairs", { passkey: password });
  }
});
socket.on("username-add", (data) => {
  if (password != "eee") {
    socket.emit("get-client-pairs", { passkey: password });
  }
});

document.getElementById("error").addEventListener("submit", (e) => {
  e.preventDefault();

  userid = cid.value;
  message = document.getElementById("errorinput").value;

  socket.emit("senderror", {
    passkey: password,
    client_id: parseInt(userid),
    message: message,
  });
});

socket.on("serror", (data) => {
  console.log("server error:" + data);

  serror = document.getElementById("serror");

  serror.innerText = "Server Error(s): " + data;
  setTimeout(() => {
    serror.innerText = " ";
  }, 8 * 1000);
});

socket.on("disconnect", () => {
  document.body.innerHTML = `<h1>openpixels</h1> <p>Sorry, You have been kicked. This could be either from a moderator, or a server shutdown. Thank you!</p>`;
  if (kickreason != "No Reason Given.") {
    let kickelement = document.createElement("p");
    kickelement.innerHTML = `Kick reason: ${kickreason}`;
    document.body.appendChild(kickelement);
  }
});

document.getElementById("kick").addEventListener("submit", (e) => {
  e.preventDefault();
  socket.emit("kick", {
    client_id: parseInt(cid.value),
    reason: document.getElementById("kickreason").value,
    passkey: password,
  });
});

document.getElementById("ban").addEventListener("submit", (e) => {
  e.preventDefault();
  socket.emit("ban", {
    client_id: parseInt(cid.value),
    reason: document.getElementById("banreason").value,
    passkey: password,
  });
});
