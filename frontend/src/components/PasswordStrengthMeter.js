import React from "react";

const PasswordStrengthMeter = ({ password }) => {
  const calculateStrength = () => {
    if (!password) return 0;
    
    let strength = 0;
    if (password.length >= 8) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    
    return Math.min(strength, 4);
  };

  const strength = calculateStrength();
  const strengthText = ["Very Weak", "Weak", "Good", "Strong", "Very Strong"][strength];
  const strengthColor = [
    "bg-red-500",
    "bg-orange-500",
    "bg-yellow-500",
    "bg-blue-500",
    "bg-green-500",
  ][strength];

  return (
    <div className="mt-2">
      <div className="flex items-center gap-1 h-1.5 mb-1">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className={`h-full flex-1 rounded-full ${
              i < strength ? strengthColor : "bg-gray-600"
            }`}
          ></div>
        ))}
      </div>
      <p className="text-xs text-white/60">
        Password strength: <span className={strengthColor.replace("bg", "text")}>
          {strengthText}
        </span>
      </p>
    </div>
  );
};

export default PasswordStrengthMeter;