var express = require('express');
var router = express.Router();
var multipart = require('connect-multiparty');
var uploadDir = require('path').join(__dirname, '../upload');

var User = require('../lib/user');
var path = require('path');
var fs = require('fs');
var join = path.join;
var crypto = require('crypto');
var gm = require('gm');

/* GET signout page. */
router.get('/signout', signout());

/* if already signed in, redirect */
router.use(function(req, res, next) {
	if(req.session.auth && req.session.auth['authed']){
		if(req.session.next){
			var url = req.session.next;
			req.session.next = null;
			res.redirect(url);
		}
		else{		
			res.redirect('/');
		}
	}
	else{
		next();
	}
});

/* GET signin page. */
router.get('/signin', function(req, res, next) {
	if(req.query.next){
		req.session.next = req.query.next;
	}
	res.render('signin');
});


/* POST signin data. */
router.post('/signin', signin());

/* GET signup page. */
router.get('/signup', function(req, res, next) {
	res.render('signup');
});

/* POST signup data. */
router.post('/signup', multipart({uploadDir: uploadDir}), signup(uploadDir));

/* GET other pages that does not exist */
router.use(function(req, res, next) {
	res.redirect('/account/signin');
});


module.exports = router;

/********************************************************/

function signup(dir){
	return function(req, res, next) {
		var data = req.body.user;
		User.checkExist(data.email, data.wwid, function(err){
			if(err){
				fs.unlinkSync(req.files.user.portrait.path);
				res.error("email or wwid already taken!");
				res.redirect("back");
			}else{
				var user = new User({
					wwid: data.wwid,
					nick: data.nickname,
					pass: data.password,
					email: data.email,
					port: "default"
				});

				// move & rename user's portrait
				if(req.files.user.portrait.name){
					var img = req.files.user.portrait;
					if(img.size > 1024 * 1024){
						res.error("portrait image should smaller than 1M!");
						res.redirect("back");
						return;
					}
					if(img.type !== "image/jpeg"){
						res.error("only accept portrait image of type jpg/jpeg!");
						res.redirect("back");
						return;
					}
		
					var name = new Date().getTime().toString();
					var md5 = crypto.createHash('md5');
					md5.update(name);
					name = md5.digest('hex');
					name = name.substring(0,8);
					var path = join(dir, name + ".jpg");
					var thumb_path = join(dir, name + ".thumb.jpg");
					fs.rename(img.path, path, function(err){
						if(err){
							fs.unlinkSync(img.path);
							return next(err);
						}
						
						gm(path).thumb(100, 100, thumb_path, 100, function(err){
							if(err){
								console.log(err);
								fs.unlinkSync(path);
								return next(err);
							}
						});
						
						user.port = name;
						saveUser(req, res, next, user);
					});	
				}else{
					fs.unlinkSync(req.files.user.portrait.path);
					saveUser(req, res, next, user);
				}
			}
		});
	};
}

function saveUser(req, res, next, user){
	// grant as user first
	user.type = 'user';

	// save user to db
	user.save(function(err){
		if (err){
			console.log(err);
			return next(err);
		}
		authedUser(user, req, res, next);
	});
}

function authedUser(user, req, res, next){
	User.getAuth(user.wwid, function(err, auth){
		if(err){
			console.log(err);
			return next(err);
		}
		req.session.auth = auth;
		req.session.auth['authed'] = true;
		req.session.wwid = user.wwid;
		
		if(user.type == 'kitchen'){
			req.session.kit_bind = user.kit;
		}
		if(req.session.next){
			var url = req.session.next;
			req.session.next = null;
			res.redirect(url);
		}
		else{
			res.redirect(auth.home);
		}
	});
}

function signin(){
	return function(req, res, next) {
		var data = req.body.user;
		User.auth(data.email, data.password, function(err, user){
			if(err){
				console.log(err);
				return next(err);
			}
		
			if(user){
				authedUser(user, req, res, next);
			}else{
				res.error("Sorry! invalid credentials!");
				res.redirect('back');
			}
		});
	};
}

function signout(){
	return function(req, res, next) {
		req.session.destroy(function(err){
			if(err) throw err;
			
			if(req.query.next){
				res.redirect(req.query.next);
			}
			else{
				res.redirect('/account');
			}
		});
	};
}
