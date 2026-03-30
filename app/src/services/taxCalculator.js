export const calculatePropertyTax = ({ value, area, rate = 0.01, areaRate = 10, serviceFee = 70 }) => {
  const baseTax = Number(value || 0) * rate;
  const areaTax = Number(area || 0) * areaRate;
  const total = baseTax + areaTax + serviceFee;

  return { baseTax, areaTax, serviceFee, total };
};
