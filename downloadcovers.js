 
   
(function dcns(){
  
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const sharp = require('sharp');
  const datauris = require('datauris'); 
    
  let fn = process.argv[2];
  let j = fs.readFileSync(fn,'utf8');
  let s = JSON.parse(j);
  
  let cnt = s.length;
  let updated = false;
  
  s.forEach( t => {   
    datauris.fromUrl(t.cover, (err,datauri) => {
      if (err) console.error(err);
      let {contenttype,buffer,ext} = datauris.parse(datauri);
      sharp(buffer)
        .resize(200)
        .toBuffer( (err,data) => {
          cnt--;
          if (!err) {
            t.cover = datauris.fromBuffer(data,contenttype);
            updated = true;
          }
          if ( (cnt==0) && updated ) {
            console.log('done ',fn+'.new.json');
            fs.writeFileSync(fn+'.new.json',JSON.stringify(s,null,2));     
          }              
        }); 
    });    
  });
})();