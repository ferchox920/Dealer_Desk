export function validatorBodyCreateError(req, res, next) {
    const { 
        year, 
        brand, 
        model, 
        mileage, 
        price, 
        drive_train, 
        fuel_type, 
        vin_number 
    } = req.body;

    if (
        !year || 
        !brand || 
        !model || 
        !mileage || 
        !price || 
        !drive_train || 
        !fuel_type || 
        !vin_number
    ) {
        return res.status(400).json({ 
            message: "All fields are required" 
        });
    }

    next();
}
