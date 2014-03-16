/* GET 'about us' page. */
module.exports.about = function(req, res){
    res.render('generic-text', {
	    title: 'About',
	    text: 'Loc8r was created to help people find places to sit down and get a bit of work done. <br /><br />' +
			'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc sed lorem ac nisi dignissim accumsan.'
    });
};

/* GET 'sign in' page. */
module.exports.signin = function(req, res) {
	res.render('signin-index', { title: 'Sign in to Loc8r' });
};
