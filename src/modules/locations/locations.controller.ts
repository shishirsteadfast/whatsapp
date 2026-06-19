import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { LocationsService } from './locations.service';

@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get('countries')
  findAllCountries() {
    return this.locationsService.findAllCountries();
  }

  @Get('countries/:id/states')
  findStatesByCountry(@Param('id', ParseIntPipe) id: number) {
    return this.locationsService.findStatesByCountry(id);
  }

  @Get('states/:id/cities')
  findCitiesByState(@Param('id', ParseIntPipe) id: number) {
    return this.locationsService.findCitiesByState(id);
  }
}
