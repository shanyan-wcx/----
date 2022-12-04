const cheerio = require('cheerio')
const request = require('sync-request')
const { encode } = require('url-encode-decode')
const { base16, base32 } = require('@scure/base')
const { addonBuilder } = require("stremio-addon-sdk")

const manifest = {
	"id": "community.dmhy",
	"version": "1.0.0",
	"catalogs": [],
	"resources": [
		"stream"
	],
	"types": [
		"movie",
		"series"
	],
	"name": "动漫花园",
	"description": "来自动漫花园的动画电影和番剧",
	"idPrefixes": [
		"tt"
	]
}
const builder = new addonBuilder(manifest)

builder.defineStreamHandler(async ({ type, id }) => {
	console.log("request for streams: " + type + " " + id)
	if (type === "movie") {
		var streams = []
		var title = await getName(id)
		console.log(title)
		title = encode(title)
		await getStreams(title, streams)
		streams = await sortBy(streams)
		console.log(streams)
		return Promise.resolve({ streams: streams })
	} else if (type === "series") {
		return Promise.resolve({ streams: [] })
	} else {
		return Promise.resolve({ streams: [] })
	}
})

async function format(title, size, link, magnet, streams) {
	var temp = magnet.split('&tr=')
	var b32 = temp[0].replace(/&dn=.*/g, '').replace(/magnet:\?xt=urn:btih:/g, '')
	var temphash = base32.decode(b32)
	var infoHash = base16.encode(temphash).toLowerCase()
	var trackers = []
	for (i in temp) {
		if (i >= 1) {
			trackers.push(temp[i].replace(/%3A/g, ':').replace(/%2F/g, '/'))
		}
	}
	var resolution = ''
	var sort_id = 6
	if (link.indexOf('4k') != -1 | link.indexOf('4K') != -1 | link.indexOf('2160p') != -1 | link.indexOf('2160P') != -1 | link.indexOf('3840') != -1 | link.indexOf('2160') != -1 | link.indexOf('UHD') != -1) {
		resolution = '2160p'
		sort_id = 1
	} else if (link.indexOf('1080p') != -1 | link.indexOf('1080P') != -1 | link.indexOf('1920') != -1 | link.indexOf('1080') != -1) {
		resolution = '1080p'
		sort_id = 2
	} else if (link.indexOf('720p') != -1 | link.indexOf('720P') != -1 | link.indexOf('1280') != -1 | link.indexOf('x720') != -1 | link.indexOf('X720') != -1) {
		resolution = '720p'
		sort_id = 3
	} else if (link.indexOf('480p') != -1 | link.indexOf('480P') != -1 | link.indexOf('x480') != -1 | link.indexOf('X480') != -1) {
		resolution = '480p'
		sort_id = 4
	} else if (link.indexOf('360p') != -1 | link.indexOf('360P') != -1 | link.indexOf('x360') != -1 | link.indexOf('X360') != -1) {
		resolution = '360p'
		sort_id = 5
	} else {
		resolution = 'unknown'
		sort_id = 6
	}
	if (link.indexOf('HDR') != -1) {
		resolution += ' HDR'
		sort_id -= 0.5
	}
	var byte = await sizeToByte(size)
	var stream = {
		infoHash: infoHash,
		//trackers: trackers,
		description: title + `\nSize:${size}`,
		name: resolution,
		sort_id: sort_id,
		size: size,
		byte: byte
	}
	streams.push(stream)
}

async function getName(id) {
	var res = request('POST', `https://www.imdb.com/title/${id}/?ref_=nv_sr_srsg_0`)
	var str = res.getBody('utf8')
	var a = str.indexOf(`","name":"`) + 10
	var b = str.indexOf('","image":"')
	if (str.indexOf('alternateName') != -1) {
		var c = str.indexOf('alternateName') - 3
		title = str.substring(a, c)
		title_ = str.substring(c + 19, b)
	} else {
		title = str.substring(a, b)
		title_ = ''
	}
	//title = '"' + title + '"'
	if (title_ != '') {
		//title_ = '"' + title_ + '"'
		title = title + '|' + title_
	}
	title = title.replace(/\s*/g,'').replace(/\:/g,'')
	return title
}

async function getStreams(title, streams) {
	var res = request('POST', `https://share.dmhy.org/topics/list?keyword=${title}&sort_id=2`)
	var $ = cheerio.load(res.getBody('utf8'))
	var items = $("tbody tr")
	items.each(async function (idx) {
		var str = $(this).children(".title").children("a").text()
		var title = str.replace(/\n/g, '').replace(/\t/g, '')
		var magnet = $(this).children("td").children(".download-arrow").attr('href')
		var size = $(this).children("td").eq(4).text()
		var link = $(this).children(".title").children("a").attr('href')
		await format(title, size, link, magnet, streams)
	})
}

async function sortBy(streams) {
	streams.sort((a, b) => { return a.sort_id - b.sort_id })
	var temp = []
	for (i = 0; i < 12; i++) {
		temp[i] = []
	}
	for (i in streams) {
		if (streams[i].sort_id == 0.5) {
			temp[0].push(streams[i])
		} else if (streams[i].sort_id == 1) {
			temp[1].push(streams[i])
		} else if (streams[i].sort_id == 1.5) {
			temp[2].push(streams[i])
		} else if (streams[i].sort_id == 2) {
			temp[3].push(streams[i])
		}
		else if (streams[i].sort_id == 2.5) {
			temp[4].push(streams[i])
		}
		else if (streams[i].sort_id == 3) {
			temp[5].push(streams[i])
		}
		else if (streams[i].sort_id == 3.5) {
			temp[6].push(streams[i])
		}
		else if (streams[i].sort_id == 4) {
			temp[7].push(streams[i])
		}
		else if (streams[i].sort_id == 4.5) {
			temp[8].push(streams[i])
		}
		else if (streams[i].sort_id == 5) {
			temp[9].push(streams[i])
		} else if (streams[i].sort_id == 5.5) {
			temp[10].push(streams[i])
		} else if (streams[i].sort_id == 6) {
			temp[11].push(streams[i])
		}
	}
	for (i in temp) {
		temp[i].sort((a, b) => { return b.byte - a.byte })
	}
	streams = temp[0].concat(temp[1]).concat(temp[2]).concat(temp[3]).concat(temp[4]).concat(temp[5]).concat(temp[6]).concat(temp[7]).concat(temp[8]).concat(temp[9]).concat(temp[10]).concat(temp[11])
	return streams
}

async function sizeToByte(size) {
	var byte = 0
	var str = size.toString()
	if (str.indexOf('TB') != -1) {
		byte = str.replace('TB', '') * 1024 * 1024 * 1024 * 1024
	} else if (str.indexOf('GB') != -1) {
		byte = str.replace('GB', '') * 1024 * 1024 * 1024
	} else if (str.indexOf('MB') != -1) {
		byte = str.replace('MB', '') * 1024 * 1024
	} else if (str.indexOf('KB') != -1) {
		byte = str.replace('KB', '') * 1024
	}
	return byte
}

module.exports = builder.getInterface()