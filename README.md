# Fakeflix - Enterprise Software Development - Tech Leads Club

This project is part of a course from Tech Leads Club focused on Enterprise Software Development. The main goal is become able to identify if code is bad or good at any codebase, evaluate trade-offs, and create evolutionary software, with more quality and without overengineering.

## Notes from classes

### About handling Entities and Databases

When project has Entities, all Entity manipulation should be done in the application layer. Database is used for read/write data only.

### About using Entities as Services/Usecases output

Prefer a DTO rather an Entity instance as a return. That way you ensure that business logic is preserved in case the Entity changes.

### About using Interfaces to decouple dependencies

Interfaces must be used only when there's the need to compile modules individually or in cases where code depends on different implementations based on its business logic.
