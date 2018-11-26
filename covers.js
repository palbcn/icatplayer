(function cvNS() {
  
	const cache = require('cache');
	const datauris = require('datauris');

	async function getCover(cover) {
		let ca = await cache.get(cover);
		if (ca) return ca;
		let fnd = await downloadCover(cover);
		return fnd;
	}

	async function downloadCover(cover) {
		let datauri = await fromUrl(cover);
		let {contenttype,buffer,ext} = datauris.parse(datauri);
		buffer = await bufferResize(buffer, 200);
		return datauris.fromBuffer(buffer, contenttype);
	}

	function bufferResize(buffer, size) {
		return new Promise(function (resolve, reject) {
			sharp(buffer)
			.resize(size)
			.toBuffer((err, data) => {
				if (err)
					reject(err);
				else
					resolve(data);
			});
		});
	}

	function fromUrl(url) {
		return new Promise(function (resolve, reject) {
			datauris.fromUrl(url, function (err, res) {
				if (err)
					reject(err);
				else
					resolve(res);
			});
		});
	}
  
  /********************************************************************/
  
  if (require.main === module) {
    
    (async()=>{    
      let c = await getCover(process.argv[2]); 
      console.log(c);
    })();    
    
  } else {
    module.exports = getCover;
  }
  
})();
