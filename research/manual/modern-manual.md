# SimTower User Manual

Build a tower. Give its people somewhere to go. Make the journey worth staying for.

This browser edition keeps the original game's cutaway world, facilities, people and Windows-style controls. This manual reorganizes the 1994 user's manual for reading on a modern screen. Its illustrations are captured from the running browser game, using the original artwork. Start with the tutorial, then use the reference chapters when your tower needs attention.

> **Reading the numbers.** The original manual calls its simulation figures examples, rather than exact release formulas. Where the supplied executable disagrees, this edition identifies the difference. Browser-specific controls and file handling are labeled separately.

## 1. Your first tower {#first-tower}

### Start with the lobby {#getting-started}

Choose **File > New**, or **New Tower** on the opening screen. A new tower begins with a blank site and $2,000,000. The small Tool Bar grows as your star rating rises; you do not need to learn every facility at once.

![The original SimTower title artwork behind the opening New Tower, Load Saved Tower and Quit controls.](/assets/manual/images/startup.jpg "Starting SimTower, corresponding to manual pp. 8-9. The title screen and opening controls use the original game resources.")

Select **Lobby**, move to ground level and drag horizontally to define its width. Release the mouse button to finish. The lobby is the foundation for everything above and below it. A wide foundation leaves room for separate homes, workplaces and transport later; a narrow foundation is cheaper but constrains every future floor.

The original tutorial names its tower *Balginatrot*. The browser edition starts an Untitled tower. Choose **File > Save** for the first filename, or **Save As** for a different name; the tower caption follows that filename. Watch **Fund** as you build and **Pop** as tenants accept spaces. Construction is an expense; an empty office is not yet rental income.

![A small tower with offices, fast food, a standard elevator and its initial Tool Bar.](/assets/manual/images/tutorial.jpg "The first few floors: start with a lobby, then add workplaces, food and a route between them. Recreated from manual pp. 10-13 using the current game.")

### Add work, food and a way to reach them {#first-floors}

1. Select **Office** and place a few offices directly above the lobby. A new facility can create the supporting floor it needs, provided it stays inside the supported width.
2. Add **Fast Food** above the offices. Lunch creates another reason for people to travel; a facility beyond everyone's reach will not become successful just because it exists.
3. Select **Standard Elevator** and place a shaft through the floors you want it to serve. The first shaft comes with one car.
4. Use the **Finger** tool on the top machinery and drag upward to extend the shaft. The pointer changes to an extension control when you catch the machinery.
5. Let the simulation run. Inspect an office after people arrive. Its leasing state, inhabitants and evaluation tell you whether the layout works.

You can also connect adjacent floors with stairs. They fit over eligible room interiors and provide a useful alternative for short journeys. A shaft and a stair cannot occupy the same space.

> **Construction detail.** Extending an elevator creates the required structural floors. Retracting it later removes the shaft extension, but leaves those floors and their edge scaffolding. Plan the footprint before paying for a long extension.

### Read the building before expanding {#tutorial-inspection}

Choose the **Magnifying Glass**, then click an office. Its Facility window shows whether it is leased, its evaluation and its rent. The original tutorial deliberately raises an office's rent, lets the tenants react, then lowers it again. Try this with a few rooms, and compare them after a full day rather than expecting an immediate response from every tenant.

Open **Windows > Finance Window** to see income, maintenance, construction costs and your balance. Income and cash are different: a construction bill changes cash even when your tenants had a profitable quarter.

Click a person in a Facility window to inspect that person's home, destination and stress. Use **Rename** to give one a memorable name. You can return to that person through **Windows > Find Person** instead of trying to recognize a tiny sprite in a crowd.

![The original office inspection panel with its evaluation bar and rent selection.](/assets/manual/images/office.jpg "Inspecting an office, as in manual pp. 11-12 and 39-40. The panel is the game's actual bitmap-backed dialog.")

### Grow into hotel management {#tutorial-hotels}

At 300 population, your tower can reach two stars. The Tool Bar gains hotel and service choices. Place **Single Hotel Rooms**, a **Housekeeping** office and suitable service transport. Guests check in during the evening, sleep overnight and leave in the morning. Housekeepers then prepare rooms for the next arrivals.

Watch the **Hotel** map view. A dirty room that is awaiting a nearby housekeeper is a temporary problem; repeated neglect can become an infestation that requires demolition. More rooms need more cleaning capacity and a workable route, not merely more beds.

Add a security office before aiming for three stars. Your next tasks will include parking, larger hotel rooms, public shopping, leisure and waste handling. Expand a few floors at a time, then observe a morning, lunch period and evening before adding another major block.

**Original manual:** pp. 8-20. The reference chapters below explain each tutorial control in detail.

## 2. The desktop and game clock {#desktop}

### Edit window and floating tools {#edit-window}

The **Edit window** is the large cutaway view where you build and inspect your tower. Its scrollbars move around the site. Drag the thumb for a long move, use the arrows for a small adjustment, or use the Map window to jump straight to another area. The highlighted rectangle in the Map shows the portion currently visible in the Edit window.

The **Tool Bar**, **Map Window** and **Info Bar** are independent floating panels. Drag their title bars to move them. Their close boxes hide them; restore them from the **Windows** menu. Hiding a panel does not stop its information from updating. The main window can be moved, resized, minimized and maximized using its Windows-style chrome.

> **Browser controls.** A mouse wheel pans the tower vertically; Shift with the wheel pans horizontally. Right-drag also pans. These are conveniences in addition to the original scrollbars and Map. The browser page contains the game's own window system, so the in-game maximize button enlarges the game window inside the page.

![The Edit window, Map, Info Bar and expanded Tool Bar around a developed tower.](/assets/manual/images/desktop.jpg "The desktop layout, recreating the overview on manual pp. 9 and 30. The small panels can be moved independently.")

> **Artwork setting.** The browser starts with waifu2x-upscaled original artwork. Choose **Options > Textures > Original** for the original pixels, or **Upscaled (waifu2x)** to restore the default. This browser option changes rendering only.

### Info Bar, dates and daily periods {#info-bar}

The Info Bar combines the game clock, tower name, star rating, date, **Fund**, **Pop** and a message line. The message line reports income, unmet service needs and reasons a placement failed. Read it before repeating a rejected construction action.

A quarter contains three simulation days: two **WD** weekdays and one **WE** weekend. Four quarters make a year. Residents follow weekday and weekend routines; the elevator programs for those day types are stored separately.

The clock advances unevenly in displayed minutes. Lunchtime is deliberately detailed, while quiet overnight hours pass faster. Watch the clock's traffic periods rather than treating a minute of displayed game time as a fixed amount of real time.

| Elevator period | Typical concern |
| --- | --- |
| 07:00-12:00 | Office arrivals and hotel departures |
| 12:00-12:30 | Lunch and service visits begin |
| 12:30-13:00 | Lunch returns and midday queues |
| 13:00-17:00 | Afternoon business, shops and leisure |
| 17:00-21:00 | Office departures, hotel arrivals and dinner |
| 21:00-07:00 | Late returns, cleaning consequences and quiet hours |

![The Info Bar showing the clock, weekday and quarter, rating, funds and population.](/assets/manual/images/info-bar.jpg "The status information described on manual pp. 24 and 33-34. The native clock, stars and field layout are reused.")

### Pause and diagnostic views {#pause}

Click the time control in the Tool Bar to pause or resume. While paused, you can still inspect facilities and people. Construction and the Finger controls require the active game. Scrolling and modal inspection windows also suspend ordinary simulation updates so you can examine the building without traffic moving under the pointer.

The Map's **Eval**, **Pricing** and **Hotel** views pause the simulation and switch to inspection. Return to **Edit** to restore the normal view and resume. The live Elevator window is a special case: its schedule display can update while the ordinary tower runs, while input to the other game windows is disabled. Its **Simulate** preview deliberately suspends the real tower.

### Menus, animation, sound and Fast Mode {#options}

Open a menu by clicking its name, or hold the primary mouse button on its name, move to a command and release to choose it. Releasing outside the ordinary menus cancels the menu without building in the tower underneath.

Press and release **Alt** or **F10** to select the main menu bar. **Alt+F**, **Alt+O**, **Alt+W** and **Alt+H** open File, Options, Windows and Help directly. Arrow keys move the highlight, **Enter** chooses a command and **Escape** backs out. Underlined letters identify menu access keys. From the main tower window, **Alt+Space** opens its system menu and **Alt+F4** requests Exit through the save guard. These controls do not add a system menu to the Elevator schedule window. **F1** opens help.

| Menu | Commands and purpose |
| --- | --- |
| File | New, Open, Save, Save As and Exit |
| Options | People and Effects animation; Elevators, Background and Events sound; Fast Mode; Call Fire Rescue |
| Windows | Show or hide the Tool Bar, Info Bar and Map; Finance; Find Person; Find Tenant |
| Help | Contents and About SimTower |

**People** controls periodic room-occupant animation. **Effects** controls the original machinery and rain palette animation. They are independent options; turning them off does not remove facilities or suspend gameplay. A room can still refresh when its actual state changes.

**Elevators** enables lift sounds. **Background** enables environmental and active-facility sounds, including sounds when you inspect a working facility. **Events** enables construction and special-event cues. The browser may require a user interaction before audio playback is allowed.

**Browser texture option.** **Options > Textures** chooses the supplied artwork's waifu2x enlargement or its original pixels. This edition starts with the enlargement selected. The texture submenu is a browser addition; it does not change facility dimensions, simulation rules or the original dialog artwork.

Normal speed is the default. Enable **Options > Fast Mode** deliberately when you want to accelerate the building. **Fast Mode** accelerates the simulation. The original program ran as quickly as its computer could process it. This browser edition deliberately limits Fast Mode to one update per paint with a minimum pacing interval, so modern hardware cannot race through years in a few seconds. Its actual acceleration depends on the display and browser; it is not an exact native speed multiplier. Turn it off when you want more time to observe a rush. **Call Fire Rescue** is only available during a fire; see the emergency chapter before committing to its cost.

**Original manual:** pp. 24, 26-30 and 33-34.

## 3. Building rules and construction tools {#construction}

### Foundation, floors and sky lobbies {#lobbies-floors}

Start with one ground lobby. You may extend it horizontally later, but cannot demolish it. Adjacent extensions belong to the same tower; the game does not create two independent buildings just because you leave a gap in your plan.

Floors above and below must stay within the structure's supported width. The **Floor** tool extends an existing floor to the clicked edge, filling the structural gap. Facilities can also create missing structural floor segments when their placement is legal. Empty floors cost money and remain after rooms are removed.

Every fifteenth above-ground floor can hold a **sky lobby**: 15F, 30F, 45F and so on. These are important transfer locations between local and express service. The ordinary building reaches 100 storeys and ten basements; the cathedral's five-level structure is the roof exception.

Hold **Control** while constructing the original lobby to choose a taller lobby; **Control+Shift** selects the triple-height form. Its additional levels occupy real structural space, so placement and transport must account for them.

### Place, repeat and replace facilities {#placement}

Select a facility on the Tool Bar. The cursor outlines its footprint, and the Info Bar identifies the choice and price. Click a legal supported position to begin construction. Some facilities span multiple levels: the outline and construction reservation include the whole footprint.

Grouped Tool Bar buttons open related choices immediately while held. Move to an alternative, such as a different hotel or elevator type, and release to select it. While held, moving beyond the popup's edge keeps selection at the nearest edge row; it does not cancel the choice. A right-button press cancels the grouped choice and retains that group's previous facility. The available groups expand at higher star ratings.

Hold the mouse button while drawing lobbies and floors to set their span. Parking places can be repeated horizontally; parking ramps can be repeated downward. The pointer and message line report collisions, floor restrictions, insufficient funds and fixed pool limits.

To replace an eligible facility, select the new facility, hold **Shift** and place it over the old one. This removes the old item and builds the new one if the replacement is legal. Protected buildings and structural restrictions still apply.

![A developed tower with its Tool Bar and native construction artwork.](/assets/manual/images/construction.jpg "Construction tools and placement context, recreating manual pp. 43-46. Floor edges retain the original emergency scaffolding.")

### Bulldozer and Finger {#bulldozer-finger}

The **Bulldozer** removes an eligible room, shaft or link without a demolition fee. Rebuilding costs money. Its floor stays in place. Removing an occupied facility also removes its inhabitants and can undo its contribution to population.

An occupied condo is especially expensive to remove: the original sale payment must be returned. Lobbies and certain large or service structures are protected from ordinary demolition; a footprint that fits over them is not permission to erase them.

The **Finger** has two elevator jobs. Drag the shaft's top or bottom machinery to extend or retract it. Click a floor number on a shaft to change whether the whole shaft stops there. A red waiting-floor number belongs to a car's home stop and cannot be disabled. Warnings identify changes that could strand travellers.

**Original manual:** pp. 10, 15, 43-46 and 50.

## 4. Transport that keeps people moving {#transport}

### Stairs and escalators {#stairs-escalators}

Stairs connect neighboring floors. They can overlay eligible offices, homes and public rooms without demolishing them. They cannot overlap an elevator shaft or its protected machinery. The artwork has two synchronized halves, one on each connected level.

Escalators also connect neighboring floors, but their landings must be in public or commercial space. They are valuable around food, shops, leisure facilities and lobbies. An available escalator avoids an elevator queue; its transport stress is lower than an ordinary stair's. People still need a complete legal route to their destination.

Commercial areas connected by escalators can receive visitors from one another's traffic. This means real people choosing accessible destinations and increasing that business's patronage. It does not merge the businesses' own customer budgets or automatically redistribute receipts.

> **Release difference.** The printed manual describes four stair sets and seven escalator uses per passage. The supplied executable bounds these routes to three stair transitions and six escalator transitions, with the stair bound applying to mixed alternatives. This port follows the executable.

### Choose the right elevator {#elevator-types}

| Type | Use | Planning constraint |
| --- | --- | --- |
| Standard | Everyday tenant and visitor journeys | Shaft span is limited to 30 floors; zone taller towers |
| Service | Infrastructure workers and service access | Provide a usable path to the floors that need service |
| Express | Longer journeys through sky-lobby groups | Stops and waiting points follow the original lobby-group rules |

A new shaft starts with one car. Select its elevator construction tool and click inside the shaft to add another car at a legal floor; that floor becomes the new car's waiting floor. Use the top and bottom machinery controls to change the served span. Check both ends, particularly when the shaft also serves basements.

A tower can have 24 shafts in total across all elevator types. The supplied executable uses up to eight cars per shaft. More cars help only when they can collect the right passengers and reach the right stops.

> **Release difference.** The printed manual gives capacities of 17 standard/service passengers and 36 express passengers. The supplied executable's boarding limits are 21 and 42. The current car inspection panel shows the limit used by this port.

### Program a shaft for each part of the day {#elevator-programs}

Inspect a shaft or its machinery to open the **Elevator** window. Clicking a moving car opens its passenger information instead. Select **Weekday** or **Weekend**, then the time period you want to change. Programs apply to the entire shaft, rather than to one car.

Hold a time-period button to open its departure choices immediately, move to the desired choice and release to apply it. Moving beyond the popup's edge keeps the nearest edge choice selected. A right-button release cancels the departure change while still selecting that time period.

Drag the Elevator caption to move the window. Close it with its original **OK** button, which also restores an active Simulate preview before returning control to the tower. The schedule has no system-menu icon; **Alt+Space** and **F10** do not open a menu there, and **Escape** or **Alt+F4** leave it open.

**Local** serves requests while responding to the current traffic direction. **Express to Top** and **Express to Bottom** impose a sweep toward the chosen end before the return service. These are scheduling programs for a shaft, separate from constructing the Express elevator type.

An express sweep can help a concentrated rush, but the endpoint is the shaft's own top or bottom. Sending office arrivals through deep basements, or sending dinner traffic past its intermediate destination, can create a longer journey. Use a mix of local service and well-chosen express periods where traffic is varied.

![The actual Elevator window with day programs, response, departure delay and live car columns.](/assets/manual/images/elevator.jpg "The controls described on manual pp. 15-16 and 34-38. Day selection and time periods retain their original layout.")

### Response, departure delay, stops and waiting floors {#elevator-regulation}

**Waiting Car Response** compares how much closer an idle car must be to beat a moving car. The default is five floors. A larger value favors cars already moving and tends to leave idle cars at useful waiting positions; a lower value calls idle cars more readily. It is a comparison rule, not a passenger patience limit.

**Standard Floor Departure** sets a pause before departure. The default is zero. A modest wait can collect an expected burst of passengers, but a long wait delays everyone else who needs that car.

The left column of the schedule grid lists served floors. Click a floor number to enable or disable service. Each car has a separate column: click a legal row to set that car's waiting floor. The car returns there when it has no work. Waiting floors cannot be switched off. Express service has additional fixed stop restrictions.

The live grid distinguishes movement direction, turnaround, a waiting car, passenger destinations and a full car. Watch several updates before changing a setting: a car that is briefly stopped is not necessarily stuck.

### Show, Simulate and passenger inspection {#elevator-preview}

**Show** changes how the shaft is drawn. With Show off, the room interiors behind it become visible and the cars remain between guide lines. Inspect the machinery to reopen the control window when the shaft body is hidden.

**Simulate** pauses the real tower and draws only the selected shaft with a traffic preview. It is a management experiment, not an extra source of earnings or permanent passengers. **Resume** restores the tower and its normal display. Use it to compare a proposed program before returning to ordinary traffic.

Inspect a car, stair or escalator to see the actual passengers using it. Click a displayed passenger for a person inspection. Upward lift queues appear on one side of the shaft and downward queues on the other. A full car can bypass new pickups, so a moving car is not proof that the waiting line has capacity.

![A selected shaft in the Simulate view.](/assets/manual/images/elevator-preview.jpg "The selected-elevator preview, corresponding to manual p. 38. Resume restores the ordinary tower.")

### Plan a network, then test the rush {#transport-strategy}

Place local elevators for everyday stops and express elevators for longer transfers. Build sky lobbies at the correct fifteen-floor levels so the two systems have usable meeting points. A route needs native connectivity at its handoff; adjacent-looking shafts do not automatically form an unlimited chain.

Lateral placement matters too. A distant stair can be a poor substitute for a nearby car. Keep food and short-trip escalators near the offices they serve, and inspect the traffic around a cinema's upper entrance and lower exit.

Assign idle cars to the floors where bursts start. A large office zone is a good waiting location for lunch departures; a lobby needs enough pickup capacity for arrivals. Avoid applying one rush-hour program to every shaft when residents, shoppers and workers are travelling in different directions.

Inspect a queue or an unhappy person, locate the actual destination and identify the failed leg. Add capacity or another route only after determining whether the problem is a disabled stop, an invalid transfer, a full car or a long wait.

**Original manual:** pp. 34-38, 46-48 and 54-56.

## 5. Homes, offices and hotels {#tenants}

### Offices {#offices}

Each office has six persistent workers. Office traffic includes morning arrivals, business outings, lunch or occasional clinic visits, returns and evening departures. A successful tower accommodates these different journeys rather than serving only the morning lobby rush.

Offices rent on a quarterly contract. Their four price choices affect both payment and acceptance. A lease must run for its minimum period; an angry tenant does not leave the instant you change a price. Inspect the room's **Length**, **Eval**, rent and comments after the relevant evaluation boundary.

Good conditions can encourage another tenant into a neighboring vacant space. Persistent bad conditions can stop acceptance or cause a later departure. Repair access, noise and service problems before assuming that lowering every rent is the only solution.

### Condominiums {#condos}

A condo holds three persistent family identities and is **sold**, not rented. Its purchase provides a one-time payment when it is accepted. There is no daily or quarterly condo rent. Residents have different outings, shopping and homecoming schedules, including different weekend behavior.

The sale price cannot be changed while the condo is occupied. If residents leave because of poor conditions, or you demolish their home, the recorded payment is returned. Treat condo income as an obligation that can reverse, not as money with no future cost.

Keep noisy uses away from bedrooms where possible. Noise can come from above, below and beside a room, so separating uses by one horizontal boundary may not be enough. Use the evaluation view and room inspection to verify the result.

![The condominium panel showing occupancy, evaluation and its locked sale price.](/assets/manual/images/condo.jpg "Condo inspection, recreating manual pp. 49 and 60. An occupied condo's price control is locked.")

### Single rooms, twins and suites {#hotels}

Single rooms accommodate one guest; twins and suites accommodate two. Guests arrive in the evening and leave in the morning. Some go out for dinner before returning, and the last guest's departure posts the room's receipt.

Hotel demand depends on price, noise, cleanliness and access. A vacant room is not a guarantee that the next guest will accept it. A dirty or neglected room can refuse arrivals, and a suite guest needs an actual parking reservation.

Suites have higher potential revenue, but their transport and parking demands are greater. They are also where a VIP visit occurs. Keep enough elevator and housekeeping capacity near them before pursuing the next rating.

![A hotel Facility window using the current original room preview and guest portraits.](/assets/manual/images/hotel.jpg "Hotel inspection, based on manual pp. 18-20 and 48-49. Hotel arrivals, dinner outings and checkout are separate states.")

### Housekeeping and infestation {#housekeeping}

A Housekeeping office provides six persistent staff. Their assigned work uses the service transport network and the original floor-search order. Their location and route matter: more beds spread over more floors require coverage, even if a distant cleaning office appears idle.

Rooms become dirty after checkout. A worker's arrival starts cleaning and changes the room's condition, then the worker completes the cleaning countdown before searching for another job. A visible working housekeeper is different from an ordinary guest.

If a dirty room remains neglected for three daily evaluations, it becomes infested. Infestation is irreversible through ordinary cleaning. Remove the affected eligible room and rebuild it. Neglect can also spread to adjacent hotel records, so do not wait until a whole strip is unusable.

Use the Hotel map to find the problem rooms, then inspect their condition and their housekeeper's journey. Ensure routes serve both the cleaning office and the hotel floors. Security's exterior emergency stairs are a separate system and cannot substitute for housekeeping transport.

**Original manual:** pp. 19-20, 25, 32, 48-49, 51 and 58-60.

## 6. Shops, food and entertainment {#commerce}

### Fast food, restaurants and retail shops {#food-shops}

Fast food serves daytime snacks and lunch. Restaurants mainly serve evening dining, with the native resident schedules also determining particular outings. Different original storefronts are styles of the same facility type; a noodle shop is not a separately invented simulation system.

Food businesses are managed through patronage rather than a lease-rent slider. Their closing receipts come from the original customer tables, so low attendance can produce a loss. Inspect **Today's Patronage**, income and comments rather than judging success by a storefront's appearance.

Retail shops are quarterly rental properties. Their success is judged by customer totals, and rent shifts the success thresholds. A shop can eventually lose its tenant when sales remain poor. Shops, food and outside patrons all need usable transport to their selected destinations.

![The fast-food Facility window with patronage and daily profit.](/assets/manual/images/food.jpg "Food business inspection, recreating manual pp. 12, 55 and 58-59. Actual admissions determine closing receipts.")

### Customers, recommendations and shared traffic {#commercial-demand}

Each commercial facility has its own persistent outside-customer pool and three recommendation buckets: weekday, weekend and rainy-day demand. Satisfied returning own patrons add recommendations; dissatisfied patrons add none. A new opening retains a minimum native allowance instead of spawning an arbitrary new crowd.

People already in the building also visit food and shops. Their destination comes from the appropriate lobby-band list. A visitor admitted at another establishment increases that establishment's patronage, but does not consume its own scheduled outside-customer allowance. This is the customer sharing behind the manual's escalator advice.

A venue can hold forty admitted commercial patrons at a time. Further visitors wait and retry. Forty is concurrent capacity, not the combined day's receipts limit: one patron can leave and another can be admitted later.

The original manual's illustrated customer counts are explicitly examples. In the supplied executable, own-patron opening caps for fast food and restaurants are 35 weekday, 50 weekend and 25 rainy-day; shops use 25, 30 and 18. Extra visitors are counted separately. Do not mistake those allowances for the number of people currently inside.

### Movie theatre {#cinema}

A cinema occupies two levels. Its combined booth and auditorium footprint is reserved at construction, so leave room for all of it before clicking. Its audience enters at the upper level and leaves at the lower one. Provide routes at both levels.

Inspect the theatre to see the current title, its days of showing, sales and persistent audience. **Change Movie** offers **New Movie** or **Old Classic**, with the original prices. Choosing a category cycles to another original title in that group. Popularity affects the planned audience; new construction chooses a title when it completes, rather than before the theatre exists.

Theatre patrons can visit food or shops after the first showing. A successful layout makes that onward journey possible, without forcing the crowd into one overloaded lift. The theatre's own staff do not abandon it simply because receipts were bad, and the original theatre is protected from ordinary bulldozing.

![The actual Theatre window with title, duration and audience portraits.](/assets/manual/images/cinema.jpg "Theatre management, corresponding to manual pp. 42, 50 and 60. Entrance and exit are on different levels.")

![The original movie selection dialog.](/assets/manual/images/movie-selection.jpg "Change Movie offers the original New Movie and Old Classic choices, as on manual p. 42.")

### Party halls {#party-halls}

Party halls are two-level leisure facilities with persistent guests and a scheduled afternoon event. Receipts are per party, rather than quarterly shop rent. Arrange a route to the actual entrance and enough departure capacity for the crowd.

The printed manual suggests that party attendance depends on a suitable number of hotel rooms. The supplied executable prepares its native fifty-guest allowance without that hotel-count gate. This edition follows the executable's event population and counts actual admissions for the receipt.

**Original manual:** pp. 12, 42, 49-50, 55 and 58-60.

## 7. Parking, waste and public services {#services}

### Parking places and ramps {#parking}

Parking places belong underground. Hold the placement gesture to add repeated spaces across a supported row. A ramp column connects the parking levels down from the ground lobby; build its first ramp in B1 and keep lower ramps aligned. Only one ramp column is allowed.

Parking also needs pedestrian access through legal stairs or elevators. A car route into the basement does not provide a person's route out of it. Red X artwork indicates an inaccessible place.

At the relevant ratings, selected office workers and suite guests need parking reservations. The native reservation quota is category-specific and is separate from the decorative parked-car display; counting the visible car sprites is not an exact count of all outstanding reservations.

![Original parking ramps and car spaces below the lobby.](/assets/manual/images/parking.jpg "Underground parking and its ramp column, recreating manual pp. 49-50. The original ramp artwork is used.")

### Recycling {#recycling}

Larger towers need recycling capacity. Watch the Info Bar for the missing-service and overflow messages. Recycling centers occupy two underground levels, and additional centers must be near an existing center within the native adjacency rules. Their processing requirement grows with population.

Waste processing advances through the afternoon and evening stages. Daily collection clears the lower collection display after its truck interval. Inspect the actual processing stage and readiness before adding another building.

> **Release difference.** The printed manual says recycling operation requires a service elevator. The supplied executable's runtime processing decision uses center count, population and stage, without that extra transport gate. The construction and adjacency rules still apply.

### Metro station {#metro}

The Metro, or Tube Station, occupies three underground levels, must be on the tower's bottom level and is limited to one per tower. Its original train animation uses both native artwork banks. Plan its footprint before building anything below it, because it prevents further construction underneath.

The station creates persistent passengers who arrive through its upper entrance, visit selected commercial destinations, return and can make another outing. The destination lists and transport determine where those customers can actually go. A station is not an automatic substitute for a missing route to a shop.

> **Release difference.** The printed manual describes station visitors becoming office workers or residents and shopping only underground. The recovered station handler dispatches commercial outings through the native destination lists; it does not directly move those passenger identities into office or condo households.

![The underground station, recycling center and parking levels in the current game.](/assets/manual/images/services.jpg "The service basement, replacing the facility illustrations on manual p. 51 with a captured current-game scene.")

### Medical centers, security and SECOM {#medical-security}

Medical centers primarily serve occasional office-worker demand from three stars onward. Place them within a useful route of the offices they serve. A missing clinic clears the day's medical readiness gate and produces a message. A clinic with forty patients makes another patient wait; being full does not by itself mean the building lacks medical provision.

A security office has six staff. They handle bomb searches and fire response through the tower's **outside emergency stairs**, not passenger elevators. Place offices at several heights so a response does not begin far from its target.

The higher-rating SECOM facility changes the native emergency response. It is an original facility with its own restrictions and artwork, not a new browser security mechanic. Keep the existing security staff distributed even when adding advanced support.

**Original manual:** pp. 49-53.

## 8. Inspect, diagnose and manage money {#management}

### Facility and person windows {#inspection}

Use the Magnifying Glass on a room to open its Facility window. The preview identifies the actual room; the state tells you whether it is leased, vacant, dirty or otherwise active. Eligible rooms expose their four price tiers. Food, theatre and service panels use the fields appropriate to their own simulation.

An **Eval** bar summarizes the facility's result. Blue is favorable, yellow is acceptable or marginal, and red indicates a serious problem. The bar can be empty at a color transition; that is not a missing texture. Patronage facilities can show customer figures within their result display.

Click an inhabitant in a panel or transport inspection to open the person's **Tenant** window. **From** identifies the home facility. **Going to** identifies the current destination. The evaluation/history view and current stress describe related but different things: a short current queue does not erase a long record of bad journeys.

![A person inspection with portrait, home, destination and stress information.](/assets/manual/images/person.jpg "Individual inspection, recreating manual pp. 17-18 and 40-41. Persistent identities can be named and followed.")

### Names and Find {#find}

**Rename** is available from eligible facility and person windows. The original game stores a limited named-person list; a name is a way to retain a recognizable identity, not a new resident slot. The original name field has a short character limit.

Open **Windows > Find Person** to choose a named person. The game locates that identity in its room, queue, lift or other current state, scrolls to the location and displays the original marker. When the tracking interval ends, the prior running state resumes.

**Find Tenant** helps locate an occupied facility by name. Use it when a large tower makes it difficult to remember the floor of a particular business. If a tenant or person has left, the name cannot create a new copy of them.

![The actual Find Person dialog.](/assets/manual/images/find-person.jpg "Find Person, corresponding to manual pp. 41-42. Naming an inhabitant makes the identity available for tracking.")

### Evaluation, pricing and hotel maps {#map-modes}

The Map provides four modes. **Edit** shows the building silhouette and transport with a rectangle for the current viewport. Click or drag in it to navigate. The other modes color the tower and pause ordinary time.

| Mode | What the colors mean | Useful next action |
| --- | --- | --- |
| Eval | Excellent, good and terrible facility evaluations | Inspect the red or marginal rooms and their journeys |
| Pricing | High, average, low and very-low tiers | Compare prices with evaluation before changing rents |
| Hotel | Clean, dirty and infested room conditions | Check housekeeping coverage and rebuild irreversible neglect |

The colors describe the selected diagnostic, not a general measure that is the same in all three views. A high-rent blue office can be successful; a cheap office can still have impossible access.

![Evaluation map and color-coded tower.](/assets/manual/images/evaluation.jpg "Evaluation view, recreating manual pp. 17 and 31. Diagnostic selection pauses the game.")

![Pricing map and its four price-tier colors.](/assets/manual/images/pricing.jpg "Pricing view, corresponding to manual p. 32. Price and satisfaction are separate diagnostics.")

![Hotel map highlighting dirty and neglected room conditions.](/assets/manual/images/hotel-map.jpg "Hotel view, corresponding to manual p. 32. Use it to identify cleaning failures before they spread.")

### Finance window and cash commitments {#finance}

The Finance window pauses the game and shows the current quarter. **Total Income** groups earned revenue by the original facility categories; **Total Maintenance** groups continuing operating costs. **Net Revenues** is their difference.

**Other Income** includes exceptional receipts such as treasure. **Construction Costs** records new structural and facility spending. **Last Quarter's Balance** and **Total Balance** let you reconcile the current period with your remaining funds.

The native Finance panel displays internal money units: **multiply its numerical figures by 100** for dollars. The Info Bar's Fund field and price selections use the displayed currency directly. This is a convention of the original panel, not an additional charge.

Maintain a cash reserve for expansion, maintenance and emergencies. Selling condos can make the balance look strong, but their payments can be refunded if their residents leave. Similarly, a populated tower may need more service capacity before it is safe to spend its whole cash balance on height.

![The actual Finance window with quarter accounts and balance fields.](/assets/manual/images/finance.jpg "Quarterly finances, recreating manual pp. 13 and 38-39. The original panel's figures use its multiply-by-100 convention.")

### Stress, retention and recommendations {#stress}

Stress accumulates through journeys, waiting and specific service outcomes. The native histories use each person's completed trips rather than averaging an entire room into a single invented traveller. Facility evaluation then uses the appropriate household or business result.

The printed simulation appendix describes color bands and sales examples as modeling aids. The supplied release's PART tables and handlers govern the current game. Use the displayed bars, current journey and facility comments as actionable evidence; do not treat an illustrative formula from the old manual as a universal exact threshold.

A good residential or office evaluation can reopen acceptance in a same-type neighboring vacancy. Bad conditions can cause later departure. Commercial recommendations influence the next opening's own customer allowance, while an external visitor's admission contributes to the visited venue's actual patronage.

Price and noise can change acceptance even with the same elevator wait. When many tenants complain, diagnose the common transport or service problem before lowering prices across the whole building.

**Original manual:** pp. 11-18, 23, 31-32, 38-43 and 56-60.

## 9. Ratings, unusual events and the roof {#progression}

### Reach for the stars {#ratings}

Higher ratings expand the Tool Bar and bring greater operational demands. Population is necessary, but later ratings also require service milestones. The model counts accepted residents and native visitor allowances, so Pop is not simply the number of occupied room cells drawn on screen.

| Rating sought | Population threshold | Additional native conditions |
| --- | --- | --- |
| Two stars | 300 | No additional service milestone |
| Three stars | 1,000 | A security office has been constructed |
| Four stars | 5,000 | Suites have been constructed, a VIP passed, recycling works, medical demand is met, and it is weekday evening |
| Five stars | 10,000 | A Metro station exists, recycling works, medical demand is met, and it is weekday evening |
| Tower | 15,000 | Five stars, the 100F cathedral and the original worship/ceremony milestone |

Security and suite construction milestones are native latches; some gates concern a history of successful construction rather than the current count of rooms. Recycling and medical readiness describe actual daily service behavior. A clinic with no patients is not evidence that medical demand has failed, and an unresolved VIP is not cleared by simply adding more population.

The original manual simplifies Tower attainment as placing the cathedral. The recovered executable also checks the population and worship milestone. Continue managing the building after reaching the roof; the tower remains playable.

### VIP visit {#vip}

A VIP visit selects a primary suite guest who has the required parking reservation. The game announces the visit and illuminates the selected suite in yellow. Its location arrow helps you find the actual guest or destination rather than guessing from the suite's floor alone.

Provide clean hotel accommodation and a reliable route to the suite. At checkout the original VIP decision uses that person's recorded journey mean. A successful stay enables the progression milestone; a lost reservation, abandoned journey or removed facility can fail it. The result is tied to a persistent guest identity, not to an arbitrary suite-quality score.

![The original VIP announcement over the current tower.](/assets/manual/images/vip.jpg "VIP arrival, recreating manual p. 53. The selected suite and guest belong to the persistent simulation.")

### Fire and rescue {#fire}

A fire alert tells you that an emergency has started. Security personnel travel on the outside stairs to fight it. Their distance and available coverage affect how quickly they reach the blaze; ordinary passenger elevators are not their emergency route.

The original helicopter offer gives you the rescue cost. Accept to hire it, or decline and observe security's progress. **Options > Call Fire Rescue** remains available while a fire exists and rescue has not already been hired. Repeated clicks do not create additional helicopters.

Fire can damage facilities and leave rubble where they stood. Rebuild after the emergency ends. Protected structures and the original damage rules still apply. The ordinary actor decisions change during the event, while elevator movement and existing passenger handling can continue.

![Fire and the original rescue helicopter above a captured current tower.](/assets/manual/images/fire.jpg "Emergency response, replacing the fire illustration on manual pp. 28-29 and 53 with the current game's original sprites.")

### Bomb threat {#bomb}

The terrorist demand offers a choice: pay the stated amount, or let security search. Paying deducts the demand from your balance. Refusing starts the native search through the exterior stairs; distributed security offices cover a large tower more effectively than one distant office.

The deadline is **13:00** in the recovered event handler, as described in the printed manual. The retained original demand dialog says “3 o'clock”; its wording disagrees with that deadline. A successful search produces the original result message. If the bomb is not found, it damages the target area. Treat the demand dialog as an actual decision, not as an informational window you can dismiss without a consequence.

![The original bomb-demand dialog over the current game.](/assets/manual/images/bomb.jpg "The bomb decision, recreating manual p. 52. Search and the deadline are part of the simulation.")

### Treasure, cathedral and special visitors {#cathedral-treasure}

The original hidden-treasure event can provide exceptional income when its underground-construction conditions are met. The result appears in a native event dialog and in the quarter's Other Income. There is no extra treasure tool to build.

The **Cathedral** sits on the 100th floor and occupies five levels. It is available at five stars, and only one belongs to a tower. Express service reaches the appropriate sky-lobby region; provide a final local route to its entrance. A roof landmark without access will not receive its worshippers.

Weekend worship uses persistent cathedral visitors. The Tower milestone brings the original angel sound and ceremony artwork. The clock and seasonal ambience can also reveal unusual original visitors. These events are reasons to keep observing the building after the first successful rating.

![The cathedral's original five-level artwork and ceremony figures at the roof.](/assets/manual/images/cathedral.jpg "The 100F landmark and ceremony, recreating manual pp. 26 and 52. The art and actor resources come from the original game.")

**Original manual:** pp. 16, 22, 24-26 and 51-54.

## 10. A manager's working checklist {#strategy}

### Diagnose before spending {#manager-checklist}

- **At the morning rush:** observe office arrivals and hotel departures. Look for waiting cars that could start closer to the demand and queues with no legal destination route.
- **At lunchtime:** check office-to-food and clinic journeys, intermediate lift stops and short escalator routes. A program that was good at 08:00 can be bad at 12:00.
- **In the afternoon:** inspect shops, theatre arrivals and departures, and garbage processing. Provide enough route capacity for the crowd to leave as well as enter.
- **In the evening:** check hotel acceptance, suite parking and restaurant traffic. Compare the day result with service readiness before chasing another star.
- **After checkout:** use the Hotel map. Follow a housekeeper if rooms stay dirty and rebuild irreversible infestation before it spreads.
- **At the quarter boundary:** compare accounts, rent tiers and tenancy results. Keep enough cash to absorb condo refunds and a rescue bill.

Build transport zones around actual demand. Add cars where pickups begin, use express service for longer journeys, and connect local service at sky lobbies. Keep destinations near their customers without putting noisy shops directly against sensitive homes. A tower is a network of repeated daily journeys, not just a collection of attractive facades.

### Files and browser adaptation {#files}

**New** creates another blank tower. **Open** reads a supported browser save. **Save** and **Save As** download the current browser game's JSON state, and local autosave retains an additional copy in this browser. The first Save asks for a filename; later Saves reuse it. Save As always asks for another filename and updates the tower caption. A browser may add a suffix to a duplicate download instead of overwriting the previous file. The native Windows file chooser and original native save format are deferred.

The save guard appears before New, Open or Exit when an existing tower needs a decision. Choose whether to save, continue without a save or cancel. Downloaded files belong to the browser's chosen download location; this version does not silently write an original DOS save into the game's folder.

Keep a downloaded backup before major restructuring. Browser-local data is tied to this site and browser profile. Opening a native DOS/Windows SimTower save is not currently supported.

### Troubleshooting {#troubleshooting}

| Symptom | What to inspect first |
| --- | --- |
| A placement fails | Info Bar message, support width, rating, overlap and whole multi-level footprint |
| Empty offices or shops | Actual access route, accepting state, price/noise and the daily or quarter boundary |
| Red people or a long queue | Destination, serving stops, car capacity, program and transfer connectivity |
| A suite refuses guests | The selected guest's parking reservation and route, plus room condition |
| Dirty rooms remain | Housekeeping availability and route, then neglect age |
| Rating will not increase | Population and the specific service/VIP/time gate in the ratings table |
| Cinema exit becomes congested | Lower-level departure route and onward shop/food routes |
| No sound | Sound categories and browser playback permission after user interaction |
| Building seems frozen | Pause, diagnostic view, modal inspection, scrolling, menu capture or Simulate |
| A window disappeared | Windows menu visibility toggle, then its floating-panel position |

### About this edition and reference index {#about-manual}

This modern manual is based on the supplied OCR scan of **SimTower: The Vertical Empire, User's Manual**, written by **Tom Bentley**. The original game's concept and design are by **Yoot Saito**, with programming by **Takumi Abe**. The browser port retains extracted original artwork and sounds; documentation screenshots are staged captures of its actual current UI.

The printed book's introduction, tutorial, reference, transport strategies and simulation appendix are organized here by task. Original page references appear at the end of the relevant chapters. Search checks the complete manual text; the Contents list and keyword index offer direct links when you already know the subject.

The original manual warns that its simulation appendix uses illustrative formulas. This edition labels confirmed release differences for transport limits, capacities, recycling, Metro passengers, party attendance and the Tower milestone. Browser adaptation notes identify controls or behavior that differ from the original Windows program.

**Original manual:** introduction pp. 2-6; strategies pp. 54-56; simulation pp. 57-60; index pp. 61-62.
