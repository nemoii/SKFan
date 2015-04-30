var User = require('../lib/user');

exports.signup = function(req, res, next) {
	var data = req.body.user;
	User.checkExist(data.email, data.wwid, function(err){
		if(err){
			res.error("email or wwid already taken!");
			res.redirect("back");
		}else{
			var user = new User({
				wwid: data.wwid,
				nick: data.nickname,
				password: data.password,
				email: data.email
			});
			
			user.save(function(err){
				if (err){
					console.log(err);
					return next(err);
				}
				req.session.wwid = user.wwid;
				res.redirect('/');
			});
		}
	});
}

exports.signin = function(req, res, next) {
	var data = req.body.user;
			console.log(req.body);
	User.auth(data.email, data.password, function(err, user){
		if(err){
			console.log(err);
			return next(err);
		}
		
		if(user){
			req.session.wwid = user.wwid;
			res.redirect('/');
		}else{
			res.error("Sorry! invalid credentials!");
			res.redirect('back');
		}
	});
}

exports.signout = function(req, res, next) {
	req.session.destroy(function(err){
		console(err);
		if(err) throw err;
		res.redirect('/');
	});
}
