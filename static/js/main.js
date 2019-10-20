const localstorage_available = typeof (Storage) !== "undefined";

var client,
	simplemde,
	encryped_content;

let localtracker = "ws://localhost:8003"

function get_info_hash_from_url() {
	hash_value = window.location.hash;
	return hash_value.slice(1, 41);
}

function get_key_from_url() {
	hash_value = window.location.hash;
	return hash_value.slice(41);
}

const info_hash = get_info_hash_from_url();
var magnet_link;
if (info_hash) {
	var template_magnet_link = "magnet:?xt=urn:btih:{{INFO_HASH}}&dn=inetd.c&tr=udp%3A%2F%2Fexodus.desync.com%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.internetwarriors.net%3A1337&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.openbittorrent.com%3A80&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.fastcast.nz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com";
	magnet_link = template_magnet_link.replace("{{INFO_HASH}}", info_hash)
}

function is_published() {
	return window.location.hash.length >= 32;
}

function get_local_decrypted_content() {
	if (is_published()) {
		if (localstorage_available) {
			const info_hash = get_info_hash_from_url();
			encryped_content = localStorage.getItem(info_hash);
			if (encryped_content) {
				decrypted = CryptoJS.AES.decrypt(encryped_content, get_key_from_url());
				return decrypted.toString(CryptoJS.enc.Utf8)
			}
		}
	}
}


function get_local_encrypted_content() {
	if (is_published()) {
		if (localstorage_available) {
			const info_hash = get_info_hash_from_url();
			encryped_content = localStorage.getItem(info_hash);
			return encryped_content;
		}
	}
}

function peer_info_updater(torrent) {
	var interval = setInterval(function () {
		post_info.num_peers = torrent.numPeers;
	}, 4000)
};

function update_heart(class_name) {
	var heart_div_parent = document.getElementById("heart-parent");
	while (heart_div_parent.hasChildNodes()) {
		heart_div_parent.removeChild(heart_div_parent.lastChild);
	}
	var heart_div = document.createElement("div");
	heart_div.className = class_name;
	heart_div_parent.appendChild(heart_div);
}

function save_doc() {
	if (localstorage_available) {
		localStorage.setItem(get_info_hash_from_url(), encryped_content);
	}
}

function remove_doc() {
	if (localstorage_available) {
		localStorage.removeItem(get_info_hash_from_url());
	}
}

function get_random_key() {
	var text = "";
	var possible = "abcdefghijklmnopqrstuvwxyz0123456789";
	
	for (var i = 0; i < 15; i++)
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	
	return text;
}

function show_smsg(msg) {
	var elem = document.getElementById('smsg');
	elem.innerHTML = msg;
	elem.style.display = 'block';
	setTimeout(function() {
		elem.style.display = 'none';
	});
}

var post_info = new Vue({
	el: "#post-info-section",
	data: {
		show_post_button: true,
		class_name: "",
		num_peers: 0,
	},
	methods: {
		post_document: function() {
			var content = {
				name: document.getElementById('blog-postname').value,
				content: simplemde.value()
			};
			var stringified_content = JSON.stringify(content);
			var key = get_random_key();
			var encrypted_string =  CryptoJS.AES.encrypt(stringified_content, key);
			var f = new File([encrypted_string], file_name);
			client.seed(f, {
				announce: [localtracker]
			}, function (torrent) {
				const new_info_hash = torrent.infoHash;
				var url = new_info_hash + key;
				window.location.hash = url;
				encryped_content = encrypted_string;
				save_doc();
				post_info.show_post_button = false;
				post_info.class_name = "fas fa-heart";
				update_heart(post_info.class_name);
				quill.enable(false);
				peer_info_updater(torrent);
			})
		},
		toogle_heart: function() {
			if (post_info.class_name === "fas fa-heart") {
				post_info.class_name = "far fa-heart";
				update_heart(post_info.class_name);
				remove_doc();
			} else {
				post_info.class_name = "fas fa-heart";
				update_heart(post_info.class_name);
				save_doc();
			}
		}
	},
});

var editor = new Vue({
	el: "#editor",
	mounted() {
		main = function(ice_servers) {
			var rtcConfig = {
				iceServers: ice_servers
			}
			console.log(rtcConfig);
			client = new WebTorrent({
				tracker: {
					rtcConfig: rtcConfig
				}
			});

			simplemde = new SimpleMDE({
				element: document.getElementById("editor"),
				placeholder: "Write something :)",
				autofocus: true,
			});
	
			const local_content = get_local_decrypted_content();
			
			if (local_content) {
				var object = JSON.parse(local_content);
				show_smsg("Loading from local storage.......");
				simplemde.value(object);
				post_info.class_name = "fas fa-heart";
				// show content
	
				var encrypted_string = get_local_encrypted_content();
				var f = new File([encrypted_string], file_name);
				post_info.show_post_button = false;
				client.seed(f, {
					announce: [localtracker]
				}, function (torrent) {
					peer_info_updater(torrent);
				});
			} else {
				var json_file;
				if (magnet_link) {
					show_smsg("Loading from peers.......");
					post_info.class_name = "far fa-heart";
					post_info.show_post_button = false;
					client.add(magnet_link, function (torrent) {
						torrent.files.forEach(function (file) {
							var reader = new FileReader();
							reader.addEventListener("loadend", function () {
								encryped_content = reader.result;
								var decrypted_content = CryptoJS.AES.decrypt(reader.result, get_key_from_url());
								var object = JSON.parse(decrypted_content.toString(CryptoJS.enc.Utf8));
								simplemde.value(object);
							});
			
							file.getBlob(function (err, blob) {
								reader.readAsText(blob);
							});
	
							var interval = setInterval(function () {
								post_info.num_peers = torrent.numPeers;
							}, 2000)
						})
					});
				} else {
					// Editor shown
				}
			}
		};
		main();
		//var xhttp = new XMLHttpRequest();
	},
});
