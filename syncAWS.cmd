aws s3 sync . s3://sandystransfer/churchSongs --exclude .gitignore --exclude "Music Sheets" --exclude .git/* --exclude syncAWS.cmd --acl public-read
@echo run with https://sandystransfer.s3.us-west-2.amazonaws.com/churchSongs/src/churchSongs.html
@echo data file: "https://sandystransfer.s3.us-west-2.amazonaws.com/churchSongs/Data/Stites Baptist Church Song Library.json"
