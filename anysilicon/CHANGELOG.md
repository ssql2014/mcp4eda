# Changelog

All notable changes to this project will be documented in this file.

## [1.1.1] - 2024-12-19

### Added
- Documentation for Claude Code (Cursor) configuration
- Instructions for configuring MCP servers in both Claude Desktop and Claude Code
- More usage examples with natural language queries

### Updated
- README with comprehensive setup instructions for different Claude applications

## [1.1.0] - 2024-12-19

### Changed
- Replaced local calculation formula with web scraping of AnySilicon calculator
- Now uses Puppeteer to automate the actual AnySilicon web calculator
- Ensures always using the latest calculation logic from AnySilicon

### Fixed
- Fixed stdout pollution that was breaking MCP protocol communication
- All console.log statements removed from main execution path
- Debug logs now properly use stderr

### Technical Details
- Web scraper properly handles:
  - Wafer size dropdown selection (8" or 12")
  - Form field filling with correct IDs
  - Scribe width conversion from mm to micrometers
  - Calculate button clicking
  - Result extraction after calculation

## [1.0.0] - 2024-12-18

### Initial Release
- MCP server for semiconductor die per wafer calculations
- Based on AnySilicon die per wafer formula
- Supports standard wafer sizes (150mm, 200mm, 300mm, 450mm)
- Parameter validation and error handling
- Claude Desktop integration support