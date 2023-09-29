# Server API

## `username`

Sets your username

Ratelimited

### Data structure

```json
{ "name": "string" }
```

### Response

None

## `fill`

Sets a single pixel in the grid. Ratelimited

### Data Structure

```json
{0: { 0: {"author":"str" "color": "hex color code"}}}
```

### Response

The same exact data, in the `fill` callback

## `getusers`

Gets list of users

ratelimited

# Server Sent commands

## `usernames`

Has all of the usernames in it

### Data

```json
["string", ...]
```

## `username-remove`

Client has disconnected and needs to be removed from the client stored ulist

### data

`string`

## `username-add`

Client has connected and needs to be added to the client stored ulist

### data

`string`

## `username-replace`

Replaces current username of a certain socket

### data

```json
{"before": string, "after": string}
```

## `chat-message`

Sends a chat message

### data

`string`

## There is a lot more that hasn't been added - working on it.
