import numpy as np
from scipy.stats import norm
import matplotlib.pyplot as plt

# Define the cleanObservation, scalefactor, and sigma
cleanObservation = [
                        2757.713623046875,
                        2525.97509765625,
                        2348.12744140625,
                        2241.476806640625,
                        2123.01171875,
                        1902.717041015625,
                        1758.9407958984375,
                        1585.6990966796875,
                        1298.3394775390625,
                        1097.670654296875,
                        980.5802001953125,
                        863.5585327148438,
                        750.6728515625,
                        641.1778564453125,
                        520.7303466796875,
                        448.7781066894531,
                        3009.702880859375,
                        2569.01171875,
                        2202.991455078125,
                        1941.341552734375,
                        1364.87841796875,
                        1052.9647216796875,
                        783.8624877929688,
                        633.9248657226562
                    ]

# randomly selet 10 values from cleanObservation
np.random.seed(0)
random_idx = np.random.choice(len(cleanObservation), 10)
cleanObservation = [cleanObservation[idx] for idx in random_idx]


scalefactor = 2.0
sigma = 125

# Generate a range of x values from the minimum to the maximum of the cleanObservation
x_values = np.linspace(min(cleanObservation), max(cleanObservation), 100)
print(f"x_values: {x_values}")

# Loop over each index
prob = []
for idx in range(len(cleanObservation)):
    # Calculate the mean of the normal distribution
    m = cleanObservation[idx] / scalefactor

    # Calculate the PDF for the x values
    pdf_values = norm.pdf(x_values, m, sigma/np.sqrt(scalefactor))

    # log the PDF values
    log_pdf_values = np.log(pdf_values)

    # exp the log PDF values
    log_pdf_values = np.exp(log_pdf_values)

    # Append the log PDF values to the prob list
    prob.append(log_pdf_values)

# Plot prob
plt.figure(figsize=(10, 6))
for idx in range(len(prob)):
    plt.plot(x_values, prob[idx], label=f"Index {idx}")

# mark x_values on the plot
for x in x_values:
    plt.axvline(x=x, color='gray', alpha=0.1)



# Add a legend
plt.legend()

# Show the plot
plt.show()