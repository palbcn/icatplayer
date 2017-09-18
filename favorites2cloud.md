# moving favorites.json to the cloud

we will use 

1. cloudant couchdb
1. create a rest crud api for the cloudant server
2. pouchdb on the server
2. create a rest crud api for the pouchdb server
3. pouchdb on the browser
4. sync both pouchdb browser and server pouchdb 
4. sync pouchdb server with cloudant db


# favtunes in cloudant
first step it to create a database in cloudant

access cloudant with IBM id
create database "favtunes"
get permissions 
generate API key

     Key
         mrsdoesundreemationelime
     Password
         d67e54e519a38b49341fc8bf307152fae7523b9a 

         
# create a pouchdb favtunes in the server

see `favs2pouch.js` for the complete utility script, but read this
explanation and the excerpted (and simplified) code

we create a new pouchdb, just by instantiating a pouchdb 
    var db = pouchdb("favtunes.db");

and we poblate it with `bulkDocs()` 
    db.bulkDocs(favorites,() => { ...
    
inserting all the items in the initial json file, like so

    var favorites = JSON.parse(fs.readFileSync("favtunes.json", "utf-8"));
    favorites.map( (song,index) => { song._id=''+(index+1) });  // simple map to create recognizable _id s

    var db = pouchdb("favtunes.db");
    db.bulkDocs(favorites,() => { ...

    
# create a pouchdb crud interface


    
# sync the pouchdb to the cloud

now, we want to keep this local favtunes pouchdb in the server in sync with the pouchdb in the cloud
    
         
         
         