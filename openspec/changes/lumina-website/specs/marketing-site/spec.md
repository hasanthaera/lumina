# Spec Delta

## Purpose

The public Lumina website that presents the business and its landscaping, handyman and
paving/decking services, and steers visitors towards making an enquiry.

## ADDED Requirements

### Requirement: Shared layout and navigation
Every page SHALL share a common layout: a header showing the Lumina name/logo and navigation
links to Home, Services, each of the three service pages (directly or via a Services menu) and
Contact us; and a footer showing the business phone number, display email address, service
area and the current year. The navigation SHALL indicate the current page.

#### Scenario: Navigate between pages
- **WHEN** a visitor on any page selects a navigation link
- **THEN** the corresponding page loads, and its navigation item is marked as the current page

#### Scenario: Footer contact details
- **WHEN** any page is displayed
- **THEN** the footer shows the business phone number as a tap-to-call link and the display email as a mailto link

### Requirement: Business details come from configuration
The business name, phone number, display email address and service area SHALL be defined in a
single site configuration and rendered from it everywhere they appear, so changing a detail in
one place updates the whole site.

#### Scenario: Change the phone number
- **WHEN** the phone number in the site configuration is changed and the site is rebuilt
- **THEN** every page, including the header/footer and the Contact us page, shows the new number

### Requirement: Home page
The Home page (`/`) SHALL introduce Lumina, show a summary card for each of the three services
linking to its service page, and present a prominent call to action that links to the Contact
us page.

#### Scenario: Service cards link to service pages
- **WHEN** a visitor selects the Landscaping, Handyman or Paving / Decking card on the Home page
- **THEN** they are taken to that service's page

#### Scenario: Call to action
- **WHEN** a visitor selects the "Get a quote" call to action
- **THEN** they are taken to the Contact us page

### Requirement: Services pages
The site SHALL have a Services overview page (`/services/`) listing all three services, and one
page per service: `/services/landscaping/`, `/services/handyman/`, and
`/services/paving-decking/`. Each service page SHALL describe the service, list typical jobs
covered, and end with a call to action linking to the Contact us page with that service
pre-selected.

#### Scenario: Service page call to action pre-selects the service
- **WHEN** a visitor selects the call to action on the Paving / Decking page
- **THEN** the Contact us page opens with "Paving / Decking" pre-selected as the service of interest

#### Scenario: Overview lists all services
- **WHEN** a visitor opens `/services/`
- **THEN** the page lists Landscaping, Handyman and Paving / Decking, each linking to its own page

### Requirement: Not-found page
Requests for a page that does not exist SHALL return HTTP 404 with a friendly page that uses the
shared layout and links back to Home and Contact us.

#### Scenario: Unknown URL
- **WHEN** a visitor requests `/does-not-exist`
- **THEN** the response status is 404 and the not-found page is shown with links to Home and Contact us

### Requirement: Responsive and accessible presentation
All pages SHALL be usable from 320px-wide phones to desktop widths without horizontal
scrolling, and SHALL meet WCAG 2.1 AA basics: semantic headings with one `h1` per page,
alternative text on meaningful images, visible keyboard focus, sufficient colour contrast, and
a navigation menu operable by keyboard and touch.

#### Scenario: Mobile navigation
- **WHEN** the site is viewed at 375px width
- **THEN** the navigation collapses into a menu button that opens and closes with touch or keyboard, and no page scrolls horizontally

#### Scenario: Keyboard use
- **WHEN** a visitor moves through a page with the Tab key
- **THEN** every link and control receives a visible focus indicator in a logical order

### Requirement: Basic SEO metadata
Each page SHALL have a unique `<title>` and meta description, Open Graph title/description, and
a canonical URL. The site SHALL serve a `sitemap.xml` listing all public pages and a
`robots.txt` that references it. The Home page SHALL include LocalBusiness structured data
built from the site configuration.

#### Scenario: Sitemap
- **WHEN** `/sitemap.xml` is requested
- **THEN** it lists Home, Services, the three service pages and Contact us

#### Scenario: Unique titles
- **WHEN** any two pages are compared
- **THEN** their `<title>` values differ
