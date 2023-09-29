#/bin/bash

npm install

echo '{}' > database.json
echo '{}' > banned.json
echo 'passkey = "anything"' > .env
touch writes.txt
