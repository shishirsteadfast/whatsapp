import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LocationsService } from './locations.service';

@ApiTags('locations')
@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get('countries')
  @ApiOperation({ summary: 'List all countries' })
  @ApiResponse({ status: 200, description: 'Country list with dial codes and flags' })
  findAllCountries() {
    return this.locationsService.findAllCountries();
  }

  @Get('countries/:id/states')
  @ApiOperation({ summary: 'List states for a country' })
  @ApiResponse({ status: 200, description: 'State list' })
  findStatesByCountry(@Param('id', ParseIntPipe) id: number) {
    return this.locationsService.findStatesByCountry(id);
  }

  @Get('states/:id/cities')
  @ApiOperation({ summary: 'List cities for a state' })
  @ApiResponse({ status: 200, description: 'City list' })
  findCitiesByState(@Param('id', ParseIntPipe) id: number) {
    return this.locationsService.findCitiesByState(id);
  }
}
