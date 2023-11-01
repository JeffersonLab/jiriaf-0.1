var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  alert('Submission Failed, Please Check Parameters!');
  setTimeout(function() {
    window.location.href = 'history.back()';
  }, 5000);
});

module.exports = router;
