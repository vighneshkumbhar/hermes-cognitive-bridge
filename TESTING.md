# Testing

Run the gateway unit tests with `python -m unittest discover -s tests -v`. They use a fake Hermes executable and do not contact ChatGPT. Extension checks are manual: load unpacked in Chrome/Brave, pair, select text on a ChatGPT tab, transfer it, and copy the result. No ChatGPT response extraction is performed. Browser UI checks remain manual because browser profiles and extension APIs are environment-specific.
