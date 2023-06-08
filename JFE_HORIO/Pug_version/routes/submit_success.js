var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  alert('Submission Success');
  setTimeout(function() {
    window.location.href = '/job_list';
  }, 3000);
});

module.exports = router;
