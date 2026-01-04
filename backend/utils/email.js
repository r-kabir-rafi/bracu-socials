const sendVerificationEmail = async (email, token, fullName) => {
    console.log('Email verification is disabled');
    return true;
};

const sendPasswordResetEmail = async (email, token, fullName) => {
    console.log('Password reset email is disabled');
    return true;
};

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
