const crypto = require('crypto');
const querystring = require('querystring');
const moment = require('moment');

class VNPay {
    constructor() {
        this.vnp_TmnCode = process.env.VNPAY_TMN_CODE;
        this.vnp_HashSecret = process.env.VNPAY_SECRET_KEY;
        this.vnp_Url = process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
        this.vnp_ReturnUrl = process.env.VNPAY_RETURN_URL || 'http://localhost:3000/payment/callback';
    }

    sortObject(obj) {
        const sorted = {};
        const keys = Object.keys(obj).sort();
        keys.forEach(key => {
            sorted[key] = obj[key];
        });
        return sorted;
    }

    createPaymentUrl(orderId, amount, orderInfo, ipAddr) {
        const createDate = moment().format('YYYYMMDDHHmmss');
        const tmnCode = this.vnp_TmnCode;
        const secretKey = this.vnp_HashSecret;
        const vnpUrl = this.vnp_Url;
        const returnUrl = this.vnp_ReturnUrl;

        let vnp_Params = {
            vnp_Version: '2.1.0',
            vnp_Command: 'pay',
            vnp_TmnCode: tmnCode,
            vnp_Locale: 'vn',
            vnp_CurrCode: 'VND',
            vnp_TxnRef: orderId,
            vnp_OrderInfo: orderInfo,
            vnp_OrderType: 'other',
            vnp_Amount: amount * 100, // VNPay requires amount in smallest unit (VND x 100)
            vnp_ReturnUrl: returnUrl,
            vnp_IpAddr: ipAddr,
            vnp_CreateDate: createDate
        };

        vnp_Params = this.sortObject(vnp_Params);

        const signData = querystring.stringify(vnp_Params, { encode: false });
        const hmac = crypto.createHmac('sha512', secretKey);
        const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
        vnp_Params.vnp_SecureHash = signed;

        return vnpUrl + '?' + querystring.stringify(vnp_Params, { encode: false });
    }

    verifyReturnUrl(vnp_Params) {
        const secureHash = vnp_Params.vnp_SecureHash;
        delete vnp_Params.vnp_SecureHash;
        delete vnp_Params.vnp_SecureHashType;

        const sorted = this.sortObject(vnp_Params);
        const signData = querystring.stringify(sorted, { encode: false });
        const hmac = crypto.createHmac('sha512', this.vnp_HashSecret);
        const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

        return secureHash === signed;
    }
}

module.exports = new VNPay();
