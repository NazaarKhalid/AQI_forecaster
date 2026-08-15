def calculate_aqi_from_pm25(pm25):
    if pm25 is None or pm25 < 0:
        return None
        
    pm25 = round(float(pm25), 1)
        
    breakpoints = [
        (0.0, 12.0, 0, 50),
        (12.1, 35.4, 51, 100),
        (35.5, 55.4, 101, 150),
        (55.5, 150.4, 151, 200),
        (150.5, 250.4, 201, 300),
        (250.5, 350.4, 301, 400),
        (350.5, 500.4, 401, 500)
    ]

    for (bp_low, bp_high, aqi_low, aqi_high) in breakpoints:
        if bp_low <= pm25 <= bp_high:
            aqi = ((aqi_high - aqi_low) / (bp_high - bp_low)) * (pm25 - bp_low) + aqi_low
            return round(aqi)
            
    if pm25 > 500.4:
        return 500 
        
    return 0