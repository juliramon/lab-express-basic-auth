const {Router} = require('express');
const bcryptjs = require('bcryptjs');
const User = require('../models/User.model');
const mongoose = require('mongoose');

const saltRounds = 10;

const router = new Router();

router
    .get('/signup', (req, res) => res.render('auth/signup'))
    .post('/signup', (req, res, next) => {
        const {username, email, password} = req.body;

        !username || !email || !password ? res.render('auth/signup', {errorMessage: 'Username, email and password are mandatory'}) : undefined;

        const regex = /(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,}/;
        if (!regex.test(password)) {
            res.status(500).render('auth/signup', { errorMessage: 'Password needs to have at least 6 chars and must contain at least one number, one lowercase and one uppercase letter.' });
            return;
        }

        bcryptjs
            .genSalt(saltRounds)
            .then(salt => bcryptjs.hash(password, salt))
            .then(hashedPassword => {
                return User.create({username, email, passwordHash: hashedPassword})
            })
            .then(newUser => {
                console.log(`New user created: ${newUser}`)
                res.redirect('/user-profile')
            })
            .catch(error => {
                if (error instanceof mongoose.Error.ValidationError) {
                    res.status(400).render('auth/signup', { errorMessage: error.message });
                } else if(error.code === 11000){
                    res.status(400).render('auth/signup', { errorMessage: 'Username or email already in use' });
                } else {
                    next(error);
                }
            })
    })
    .get('/user-profile', (req, res) => res.render('users/user-profile', { userInSession: req.session.currentUser }))
    .get('/login', (req, res) => res.render('auth/login'))
    .post('/login', (req, res) => {
        console.log('SESSION ===>', req.session);
        const {email, password} = req.body;
        if(!email || !password){
            res.render('auth/login', {errorMessage: 'Please enter both email and password to login'});
            return;
        }
        User.findOne({email})
            .then(user => {
                if(!user){
                    res.render('auth/login', {errorMessage: 'Email is not registered. Try another email'});
                    return;
                } else if (bcryptjs.compareSync(password, user.passwordHash)) {
                    req.session.currentUser = user; // save the user in the session
                    res.redirect('/user-profile')
                } else {
                    res.render('auth/login', {errorMessage: 'Incorrect password'});
                }
            })
            .catch(error => next(error))
    })
    .post('/logout', (req, res) => {
        req.session.destroy()
        res.redirect('/')
    })
    .get('/main', (req, res) => res.render('main/index', { userInSession: req.session.currentUser }))
    .get('/private', (req, res) => res.render('private/index', { userInSession: req.session.currentUser }))

module.exports = router;