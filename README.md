# Geocoding Service with Parallel HTTP Request Processor (LMPD Crime Data - 2023)

This script is designed to process data from a CSV file by making parallel HTTP requests to an API endpoint. It reads data from the CSV file, constructs URLs based on the data, and fetches information from the API endpoint. The fetched data is then appended to an output CSV file.

## Usage

1. **Installation**: Ensure you have recent versions of Docker and Node.js installed on your system.
2. **Setup**: Install necessary dependencies by running `npm install` in the project directory.
3. **Configuration**: Modify the script variables such as `CSV_FILE`, `API_URL`, and `concurrentHttpLimit` as per your requirements.
4. **Execution**: Run the script using `./start.sh`,if script fails to run due to permission issues, please run `sudo !!` in the terminal.
5. **Output**: The processed data will be written to an output CSV file in the specified format, and can be found in the `output` folder.

## Description

- **Dependencies**: The script utilizes modules like `n-readlines`, `node-fetch`, and custom utility functions from the `./utils` file.
- **Buffer Management**: It maintains a buffer of URLs for parallel processing, preventing excessive memory usage.
- **Retry Mechanism**: In case of failed requests, the script retries with different combinations of address parameters.
- **Concurrency Control**: Limits the number of concurrent HTTP requests to avoid overwhelming the server.
- **Logging**: Displays real-time status updates on buffer size and HTTP request count.

## Note

- Ensure that the API endpoint specified is accessible and supports the required parameters.
- Adjust the `concurrentHttpLimit` according to the API rate limits and system resources.
- The script assumes a specific format for the input CSV file and may require modifications for different formats.
- Sample dataset is drawn from this dataset: https://www.arcgis.com/sharing/rest/content/items/46c4964747074431bea21e119b4b7294/data and many more here https://data.louisvilleky.gov/datasets/46c4964747074431bea21e119b4b7294/about

## Disclaimer

This script is provided as-is without any warranty. Use it responsibly and ensure compliance with API usage policies and data privacy regulations.
