package com.drcare;

import java.util.Map;

public class PricingCalculator {
    private static final Map<String, Integer> PACKAGES = Map.of(
        "quick", 150,
        "full", 280,
        "detail", 650,
        "fleet", 0
    );

    private static final Map<String, Integer> CARTYPES = Map.of(
        "sedan", 0,
        "suv", 60,
        "van", 90,
        "pickup", 120
    );

    public static int calculate(String pkg, String carType) {
        int p = PACKAGES.getOrDefault(pkg, 280);
        int c = CARTYPES.getOrDefault(carType, 0);
        return p + c;
    }

    public static void main(String[] args) {
        if (args.length < 2) {
            System.out.println("Usage: java com.drcare.PricingCalculator <package> <cartype>");
            System.exit(2);
        }
        String pkg = args[0];
        String car = args[1];
        int price = calculate(pkg, car);
        System.out.println(price);
    }
}
