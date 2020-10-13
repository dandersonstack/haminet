#!/bin/bash

set -eou pipefail

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"


echo "-------------------------------------------------"
echo "echo alias haminet=\"$DIR/haminet.sh\" >> ~/.zshrc"
echo "-------------------------------------------------"

(cd $DIR && git pull && yarn install && nohup yarn start >/dev/null 2>/dev/null & )

# (nohup "$DIR/dist/mac/haminet.app/Contents/MacOS/haminet" > /dev/null 2>/dev/null &)

