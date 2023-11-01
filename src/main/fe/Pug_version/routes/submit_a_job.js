var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
  res.render('submit_a_job', { title: 'Submit a Job' });
});

router.post('/', function(req, res, next) {
  var params= req.body;
  var keys= Object.keys(params);
  var values= Object.values(params);

  if (false)
    res.redirect('/submit_fail');

  var msg= '----------------------\r\n';
  for (let i = 0; i < keys.length; i++) {
    msg+= keys[i]+ ': '+ values[i]+ '\r\n';
  }
  msg+= '----------------------\r\n';
  console.log(msg);

  res.redirect('/job_list');
});

module.exports = router;
