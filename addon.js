const cheerio = require('cheerio')
const request = require('sync-request')
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
	],
	"behaviorHints": {
		"configurable": true,
		"configurationRequired": true
	},
	"config": [
		{
			"key": "token",
			"type": "text",
			"title": '请输入你的Token：(若没有Token,请先到https://www.myapifilms.com注册一个)',
			"required": true
		}
	]
}
const builder = new addonBuilder(manifest)

builder.defineStreamHandler(async ({ type, id, config }) => {
	console.log("request for streams: " + type + " " + id)
	var streams = []
	var token = config.token
	var temp = id.split(':')
	id = temp[0]
	var season = temp[1]
	var episode = temp[2]
	var title = await getName(type, id, token)
	if (title === '') {
		return Promise.resolve({ streams: [] })
	}
	if (type === "movie") {
		console.log(title)
		await getStreams(type, title, streams)
		streams = await sortBy(streams)
		console.log(streams)
		return Promise.resolve({ streams: streams })
	} else if (type === "series") {
		console.log(title + ' 第' + season + '季 第' + episode + '集')
		await getStreams(type, title, streams, season, episode)
		streams = await sortBy(streams)
		console.log(streams)
		return Promise.resolve({ streams: streams })
	} else {
		return Promise.resolve({ streams: [] })
	}
})

async function getName(type, id, token) {
	var res = request('GET', `https://www.myapifilms.com/tmdb/find?id=${id}&token=${token}&externalSource=imdb_id&format=json&language=zh`)
	res = JSON.parse(res.getBody('utf8'))
	if (type === 'movie') {
		var title = res.data.movie_results[0] != undefined ? res.data.movie_results[0].title.replace(/\:/g, ' ').replace(/\：/g, ' ') : ''
	} else if (type === 'series') {
		var title = res.data.tv_results[0] != undefined ? res.data.tv_results[0].name.replace(/\:/g, ' ').replace(/\：/g, ' ') : ''
	} else {
		var title = ''
	}
	return title
}

async function getStreams(type, title, streams, season = -1, episode = -1) {
	if (type === 'movie') {
		var sort_id = 2
	} else if (type === 'series') {
		var sort_id = 31
		var title_ = title
		if (season != 1) {
			var chi_numb = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九']
			title += ` S${season}|S0${season}|第${season}季|第${chi_numb[season]}季`
			console.log(title)
		}
	}
	var res = request('POST', `https://share.dmhy.org/topics/list?keyword=${encodeURIComponent(title)}&sort_id=${sort_id}`)
	var $ = cheerio.load(res.getBody('utf8'))
	var items = $("tbody tr")
	items.each(async function (idx) {
		var str = $(this).children(".title").children("a").text()
		var title = str.replace(/\n/g, '').replace(/\t/g, '')
		var magnet = $(this).children("td").children(".download-arrow").attr('href')
		var size = $(this).children("td").eq(4).text()
		var link = $(this).children(".title").children("a").attr('href')
		var re = new RegExp(`${title_}[ ]*0*([2-9]|0)`)
		if (title.match(title_) != null && ((type === 'movie' || ((title.indexOf('酷漫404') != -1 || title.indexOf('诸神字幕组') != -1 || title.indexOf('GM-Team') != -1 || title.indexOf('SweetSub') != -1 || title.indexOf('轻之国度') != -1 || title.indexOf('云光字幕组') != -1 || title.indexOf('豌豆字幕组') != -1 || title.indexOf('DIGI-STUDIO') != -1 || title.indexOf('风之圣殿') != -1 || title.indexOf('华盟字幕社') != -1 || title.indexOf('波洛咖啡厅') != -1 || title.indexOf('PCSUB') != -1 || title.indexOf('Dymy') != -1 || title.indexOf('DHR') != -1 || title.indexOf('离谱Sub') != -1 || title.indexOf('爱咕字幕组') != -1 || title.indexOf('动漫国字幕组') != -1 || title.indexOf('幻樱字幕组') != -1 || title.indexOf('LoliHouse') != -1 || title.indexOf('喵萌') != -1 || title.indexOf('桜都字幕組') != -1 || title.indexOf('极影字幕社') != -1) && title.indexOf('VCB-S') == -1 && title.indexOf('+') == -1 && title.indexOf('季合集') == -1)) && (season != 1 || (title.match(/S[0-9]/) === null && title.match(/S[0-9][0-9]/) === null && title.match(/第.*季/) === null && title.match(re) === null && title.match(/剧场版/) === null)))) {
			await format(title, size, link, magnet, streams, episode)
		}
	})
}

async function format(title, size, link, magnet, streams, episode = -1) {
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
		fileIdx: episode === -1 ? null : episode - 1,
		//trackers: trackers,
		description: '🌸'+title + '\n💿' + size,
		name: resolution,
		sort_id: sort_id,
		size: size,
		byte: byte,
		behaviorHints: {
			bingeGroup: 'dmhy-' + resolution.replace(/ /g,'-') + '-' + size
		}
	}
	streams.push(stream)
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