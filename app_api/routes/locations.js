var ctrl = require('../controllers/locations');

module.exports = function(app) {
	// locations
	app.get('/api/locations', ctrl.locationsListByDistance);
	app.post('/api/locations', ctrl.locationsCreate);
	app.get('/api/locations/:locationId', ctrl.locationsReadOne);
	app.put('/api/locations/:locationId', ctrl.locationsUpdateOne);
	app.delete('/api/locations/:locationId', ctrl.locationsDeleteOne);

	// reviews
	app.post('/api/locations/:locationId/reviews', ctrl.reviewsCreate);
	app.get('/api/locations/:locationId/reviews/:reviewId', ctrl.reviewsReadOne);
	app.put('/api/locations/:locationId/reviews/:reviewId', ctrl.reviewsUpdateOne);
	app.delete('/api/locations/:locationId/reviews/:reviewId', ctrl.reviewsDeleteOne);
};
