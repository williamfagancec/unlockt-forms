const express = require('express');
const path = require('path');
const { adminPageMiddleware } = require('../middleware/auth');

function createPagesRoutes() {
  const router = express.Router();

  router.get('/', (req, res) => {
    res.redirect('/admin-login.html');
  });

  router.get('/letter-of-appointment', (req, res) => {
    res.sendFile(path.join(__dirname, '../../public', 'letter-of-appointment.html'));
  });

  router.get('/quote-slip', (req, res) => {
    res.sendFile(path.join(__dirname, '../../public', 'quote-slip.html'));
  });

  router.get('/admin', adminPageMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, '../../public', 'admin.html'));
  });

  router.get('/admin/letter-of-appointment', adminPageMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/admin', 'letter-of-appointment.html'));
  });

  router.get('/admin/letter-of-appointment/:id', adminPageMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/admin', 'letter-of-appointment-detail.html'));
  });

  router.get('/admin/quote-slip', adminPageMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/admin', 'quote-slip.html'));
  });

  router.get('/admin/quote-slip/:id', adminPageMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/admin', 'quote-slip-detail.html'));
  });

  router.get('/admin/users', adminPageMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/admin', 'users.html'));
  });

  router.get('/change-password', adminPageMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, '../../public', 'change-password.html'));
  });

  router.get('/setup-password', (req, res) => {
    res.sendFile(path.join(__dirname, '../../public', 'setup-password.html'));
  });

  router.get('/forgot-password', (req, res) => {
    res.sendFile(path.join(__dirname, '../../public', 'forgot-password.html'));
  });

  router.get('/admin/reset-password', (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/admin', 'reset-password.html'));
  });

  return router;
}

module.exports = createPagesRoutes;
