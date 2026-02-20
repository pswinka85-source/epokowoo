import React from 'react';
import './Contact.scss';

const Contact = () => {
    return (
        <div className="contact-container">
            <h2 className="contact-title">Get in Touch</h2>
            <form className="contact-form">
                <label className="contact-label">Name:</label>
                <input type="text" className="contact-input" />

                <label className="contact-label">Email:</label>
                <input type="email" className="contact-input" />

                <label className="contact-label">Message:</label>
                <textarea className="contact-textarea"></textarea>

                <button type="submit" className="contact-button">Send</button>
            </form>
        </div>
    );
};

export default Contact;