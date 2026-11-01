-- Which car a trip used. Today each household drives its own car:
-- the grey Mitsubishi Space Star (Adir + Or) and the red Opel Corsa (Adi).
-- Recorded only; collisions and shares stay about people, not cars.
alter table ride.trips add column car text check (car in ('star', 'corsa'));
update ride.trips set car = case when rider = 'adi' then 'corsa' else 'star' end where car is null;
alter table ride.trips alter column car set not null;
