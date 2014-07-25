var mongoose = require('mongoose'),
	Loc = mongoose.model('Location'),
	sendJsonResponse = function(res, status, content) {
		res.status(status);
		res.json(content);
	},
	theEarth = (function() {
		var earthRadius = 6371; // km, miles is 3959

		return {
			'getDistanceFromRads': function(rads) {
				return parseFloat(rads) * earthRadius;
			},
			'getRadsFromDistance': function(distance) {
				return parseFloat(distance) / earthRadius;
			}
		};
	})(),
	doAddReview = function(req, res, location){
		if (!location) {
			sendJsonResponse(res, 404, { 'message': 'locationId not found' });
		}
		else {
			location.reviews.push({
				'author': { 'displayName': req.body.author },
				'rating': req.body.rating,
				'reviewText': req.body.reviewText
			});
			location.save(function(err, location) {
				var newReview;
				if (err) {
					sendJsonResponse(res, 400, { 'message': 'unable to create new review' });
				}
				else {
					updateAverageRating(location._id);
					newReview = location.reviews[location.reviews.length - 1];
					sendJsonResponse(res, 201, newReview);
				}
			});
		}
	},
	updateAverageRating = function(locationId) {
		Loc.findById(locationId).select('rating reviews').exec(function(err, location) {
			if (!err) {
				doSetAverageRating(location);
			}
		});
	},
	doSetAverageRating = function(location) {
		var i, reviewCount, reviewAverage, ratingTotal;
		// TODO: Should it unset the average rating if no reviews?
		if (location.reviews && location.reviews.length > 0) {
			reviewCount = location.reviews.length;
			ratingTotal = 0;
			for(i = 0;i < reviewCount;++i) {
				ratingTotal = ratingTotal + location.reviews[i].rating;
			}
			reviewAverage = parseInt(ratingTotal / reviewCount, 10);
			location.rating = reviewAverage;
			location.save(function(err) {
				if (err) {
					console.log(err);
				}
				else {
					console.log('Average rating updated to ', reviewAverage);
				}
			});
		}
	};

// Locations
module.exports.locationsListByDistance = function(req, res) {
	var lon = parseFloat(req.query.lon),
		lat = parseFloat(req.query.lat),
		point = { 'type': 'Point', 'coordinates': [lon, lat] },
		// TODO: Make maxDistance and num configurable from query string (defaulting to 20/10)
		geoOptions = { 'spherical': true, 'maxDistance': theEarth.getRadsFromDistance(20), 'num': 10 };

	if (lon !== lon || lat !== lat) { // if either are NaN
		sendJsonResponse(res, 404, { 'message': 'lat and lon query parameters are required' });
	}
	else {
		Loc.geoNear(point, geoOptions, function(err, results, stats) {
			if (err) {
				sendJsonResponse(res, 400, { 'message': 'Encountered error during fetching' });
			}
			else {
				var locations = [];
				results.forEach(function(doc) {
					locations.push({
						'distance': theEarth.getDistanceFromRads(doc.dis),
						'name': doc.obj.name,
						'address': doc.obj.address,
						'rating': doc.obj.rating,
						'facilities': doc.obj.facilities,
						'_id': doc.obj._id
					});
				});
				sendJsonResponse(res, 200, locations);
			}
		});
	}
};

module.exports.locationsCreate = function(req, res) {
	Loc.create({
		'name': req.body.name,
		'address': req.body.address,
		'facilities': req.body.facilities.split(','),
		'coords': [parseFloat(req.body.lon), parseFloat(req.body.lat)],
		'openingTimes': [{
			'days': req.body.days1,
			'opening': req.body.opening1,
			'closing': req.body.closing1,
			'closed': req.body.closed1
		}, {
			'days': req.body.days2,
			'opening': req.body.opening2,
			'closing': req.body.closing2,
			'closed': req.body.closed2
		}]
	}, function(err, location) {
		if (err) {
			sendJsonResponse(res, 400, err); // TODO: Better message?
		}
		else {
			sendJsonResponse(res, 201, location);
		}
	});
};

module.exports.locationsReadOne = function(req, res) {
	if (req.params && req.params.locationId) {
		Loc.findById(req.params.locationId).exec(function(err, location){
			if (err) {
				sendJsonResponse(res, 500, { 'message': 'Unable to process request' });
			}
			else if (!location) {
				sendJsonResponse(res, 404, { 'message': 'locationId not found' });
			}
			else {
				sendJsonResponse(res, 200, location);
			}
		});
	}
	else {
		sendJsonResponse(res, 404, { 'message': 'No locationId in request'});
	}
};

module.exports.locationsUpdateOne = function(req, res) {
	if (!req.params.locationId) {
		sendJsonResponse(res, 404, { 'message': 'Not found, locationId is required' });
	}
	else {
		Loc.findById(req.params.locationId).select('-reviews -rating').exec(function(err, location) {
			if (err) {
				sendJsonResponse(res, 400, { 'message': 'Unable to update location'});
			}
			else if (!location) {
				sendJsonResponse(res, 404, { 'message': 'locationId not found' });
			}
			else {
				location.name = req.body.name;
				location.address = req.body.address;
				location.facilities = req.body.facilities.split(',');
				location.coords = [parseFloat(req.body.lon), parseFloat(req.body.lat)];
				location.openingTimes = [{
					'days': req.body.days1,
					'opening': req.body.opening1,
					'closing': req.body.closing1,
					'closed': req.body.closed1
				}, {
					'days': req.body.days2,
					'opening': req.body.opening2,
					'closing': req.body.closing2,
					'closed': req.body.closed2
				}];
				location.save(function(err, location) {
					if (err) {
						sendJsonResponse(res, 404, { 'message': 'Unable to update location' });
					}
					else {
						sendJsonResponse(res, 200, location);
					}
				});
			}
		});
	}
};

module.exports.locationsDeleteOne = function(req, res) {
	var locationId = req.params.locationId;
	if (locationId) {
		Loc.findByIdAndRemove(locationId).exec(function(err) {
			if (err) {
				sendJsonResponse(res, 404, { 'message': 'Encountered error when attempting to delete location' });
			}
			else {
				sendJsonResponse(res, 204, null);
			}
		});
	}
	else {
		sendJsonResponse(res, 404, { 'message': 'No locationId' });
	}
};

// Reviews
module.exports.reviewsCreate = function(req, res) {
	if (req.params.locationId) {
		Loc.findById(req.params.locationId).select('reviews').exec(function(err, location) {
			if (err) {
				sendJsonResponse(res, 400, err);
			}
			else {
				doAddReview(req, res, location);
			}
		});
	}
	else {
		sendJsonResponse(res, 404, { 'message': 'Not found, locationId required' });
	}
};

module.exports.reviewsReadOne = function(req, res) {
	if (req.params && req.params.locationId && req.params.reviewId) {
		Loc.findById(req.params.locationId).select('name reviews').exec(function(err, location) {
			var response, review;
			if (err) {
				sendJsonResponse(res, 500, { 'message': 'Unable to process request' });
			}
			else if (!location) {
				sendJsonResponse(res, 404, { 'message': 'locationId not found' });
			}
			else if (location.reviews && location.reviews.length > 0) {
				review = location.reviews.id(req.params.reviewId);
				if (!review) {
					sendJsonResponse(res, 404, { 'message': 'reviewId not found' });
				}
				else {
					response = {
						'location': {
							'name': location.name,
							'id': req.params.locationId
						},
						'review': review
					};
					sendJsonResponse(res, 200, response);
				}
			}
			else {
				sendJsonResponse(res, 404, { 'message': 'No reviews found' });
			}
		});
	}
	else {
		sendJsonResponse(res, 404, { 'message': 'Not found, locationId and reviewId are both required' });
	}
};

module.exports.reviewsUpdateOne = function(req, res) {
	if (!req.params.locationId || !req.params.reviewId) {
		sendJsonResponse(res, 404, { 'message': 'Not found, locationId and reviewId are both required' });
	}
	else {
		Loc.findById(req.params.locationId).select('reviews').exec(function(err, location) {
			var review;
			if (err) {
				sendJsonResponse(res, 404, { 'message': 'Unable to find locationId' });
			}
			else if (!location) {
				sendJsonResponse(res, 404, { 'message': 'Unable to find locationId' });
			}
			else if (location.reviews && location.reviews.length > 0) {
				review = location.reviews.id(req.params.reviewId);
				if (!review) {
					sendJsonResponse(res, 404, { 'message': 'reviewId does not exist to be updated' });
				}
				else {
					review.author.displayName = req.body.author;
					review.rating = req.body.rating;
					review.reviewText = req.body.reviewText;
					location.save(function(err, location) {
						if (err) {
							sendJsonResponse(res, 404, { 'message': 'Failed to update the review' });
						}
						else {
							updateAverageRating(location._id);
							sendJsonResponse(res, 200, review);
						}
					});
				}
			}
			else {
				sendJsonResponse(res, 404, { 'message': 'reviewId does not exist to be updated' });
			}
		});
	}
};

module.exports.reviewsDeleteOne = function(req, res) {
	//var review;
	if (!req.params.locationId || !req.params.reviewId) {
		sendJsonResponse(res, 404, { 'message': 'Not found, locationId and reviewId are both required' });
	}
	else {
		Loc.findById(req.params.locationId).select('reviews').exec(function(err, location) {
			if (err) {
				sendJsonResponse(res, 400, { 'message': 'Unable to retrieve location' });
			}
			else if (!location) {
				sendJsonResponse(res, 404, { 'message': 'locationId not found' });
			}
			else if (location.reviews && location.reviews.length > 0) {
				//review = location.reviews.id(req.params.reviewId);
				//if (!review) {
				if (!location.reviews.id(req.params.reviewId)) {
					sendJsonResponse(res, 404, { 'message': 'reviewId not found' });
				}
				else {
					//review.remove();
					location.reviews.id(req.params.reviewId).remove();
					location.save(function(err) {
						if (err) {
							sendJsonResponse(res, 400, { 'message': 'Unable to save location after removing review' });
						}
						else {
							updateAverageRating(location._id);
							sendJsonResponse(res, 204, null);
						}
					});
				}
			}
			else {
				sendJsonResponse(res, 404, { 'message': 'No review to delete' });
			}
		});
	}
};
