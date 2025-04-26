from pydantic import BaseModel, Field

class FilterGraphRequest(BaseModel):
    countries_in: list[str] = Field(description="IATA codes for airports to include. Leave empty for all countries.")
    countries_out: list[str] = Field(default=[], description="IATA codes for airports with routes from airports in `countries_in`.")

class SimpleFilterGraphRequest(BaseModel):
    country: list[str] = Field(default = [], description="Countries to include. Leave empty for all countries")
    continent: list[str] = Field(default = [], description="continents to include. Leave empty for all")
    region: list[str] = Field(default = [], description="regions to include. Leave empty for all")
    city: list[str] = Field(default = [], description="cities to include. Leave empty for all")