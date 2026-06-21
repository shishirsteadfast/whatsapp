import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Country } from './entities/country.entity';
import { State } from './entities/state.entity';
import { City } from './entities/city.entity';
import { createLogger } from '../../common/services/logger.service';

// We need to dynamically import countries-states-cities at runtime
// because it's a CommonJS package
// eslint-disable-next-line @typescript-eslint/no-require-imports
const csc = require('countries-states-cities').default;

@Injectable()
export class LocationsService implements OnModuleInit {
  private readonly logger = createLogger('LocationsService');

  constructor(
    @InjectRepository(Country) private readonly countryRepo: Repository<Country>,
    @InjectRepository(State) private readonly stateRepo: Repository<State>,
    @InjectRepository(City) private readonly cityRepo: Repository<City>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedLocations();
  }

  // ─── Seeding ────────────────────────────────────────────────────────────────

  private async seedLocations(): Promise<void> {
    const count = await this.countryRepo.count();
    if (count > 0) {
      this.logger.log(`Locations already seeded (${count} countries)`);
      return;
    }

    this.logger.log('Seeding locations data...');
    const startTime = Date.now();

    // Seed countries
    const allCountries: ReturnType<typeof csc.getAllCountries> = csc.getAllCountries();
    const countryEntities: Partial<Country>[] = allCountries.map(
      (c: (typeof allCountries)[number]) => ({
        id: c.id,
        name: c.name,
        code: c.iso2,
        dialCode: c.phone_code,
        flag: c.emoji,
        iso3: c.iso3,
        capital: c.capital,
        currency: c.currency,
        region: c.region,
        subregion: c.subregion,
      }),
    );
    await this.countryRepo.save(countryEntities, { chunk: 500 });

    // Seed states and cities per country
    let totalStates = 0;
    let totalCities = 0;

    for (const country of allCountries) {
      const states: ReturnType<typeof csc.getStatesOfCountry> =
        csc.getStatesOfCountry(country.iso2);
      if (!states || states.length === 0) continue;

      const stateEntities: Partial<State>[] = states.map(
        (s: (typeof states)[number]) => ({
          id: s.id,
          name: s.name,
          stateCode: s.state_code,
          countryId: country.id,
        }),
      );
      await this.stateRepo.save(stateEntities, { chunk: 500 });
      totalStates += states.length;

      // Seed cities for each state
      for (const state of states) {
        const cities: ReturnType<typeof csc.getCitiesOfState> =
          csc.getCitiesOfState(country.iso2, state.state_code);
        if (!cities || cities.length === 0) continue;

        const cityEntities: Partial<City>[] = cities.map(
          (ci: (typeof cities)[number]) => ({
            id: ci.id,
            name: ci.name,
            stateId: state.id,
          }),
        );
        await this.cityRepo.save(cityEntities, { chunk: 500 });
        totalCities += cities.length;
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    this.logger.log(
      `Locations seeded: ${countryEntities.length} countries, ${totalStates} states, ${totalCities} cities (${elapsed}s)`,
    );
  }

  // ─── Query helpers ──────────────────────────────────────────────────────────

  async findAllCountries(): Promise<Country[]> {
    return this.countryRepo.find({ order: { name: 'ASC' } });
  }

  async findStatesByCountry(countryId: number): Promise<State[]> {
    return this.stateRepo.find({
      where: { countryId },
      order: { name: 'ASC' },
    });
  }

  async findCitiesByState(stateId: number): Promise<City[]> {
    return this.cityRepo.find({
      where: { stateId },
      order: { name: 'ASC' },
    });
  }

  async findCountryById(id: number): Promise<Country | null> {
    return this.countryRepo.findOne({ where: { id } });
  }

  async findStateById(id: number): Promise<State | null> {
    return this.stateRepo.findOne({ where: { id } });
  }

  async findCityById(id: number): Promise<City | null> {
    return this.cityRepo.findOne({ where: { id } });
  }
}
