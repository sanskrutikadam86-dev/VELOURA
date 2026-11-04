// Sale price ka hisaab sirf server me hota hai
exports.salePrice = p => Math.round(p.price * (1 - p.off / 100));

// async routes ke error ko Express ke error handler tak pahunchata hai
exports.wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);