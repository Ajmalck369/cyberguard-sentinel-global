const target=document.getElementById('property-context');
const section=(title,detail)=>{
  const item=document.createElement('section');
  const heading=document.createElement('h3');heading.textContent=title;
  const description=document.createElement('p');description.textContent=detail;
  item.append(heading,description);return item;
};
try {
  const response=await fetch('/api/v1/synthetic_property_context');
  if(!response.ok) throw new Error('unavailable');
  const data=await response.json();
  if(data.synthetic_only!==true || data.source_status!=='no_external_source_connected') throw new Error('invalid_demo_data');
  target.replaceChildren(
    section('Fictional location',data.place),
    section('Rental example',`${data.rental.example}: ${data.rental.monthly_demo_credits} demo credits per month.`),
    section('Upcoming project example',`${data.upcoming_project.example}: ${data.upcoming_project.status.replaceAll('_',' ')}.`),
    section('Land value example',`${data.land_value.example}: ${data.land_value.demo_credits_per_square_metre} demo credits per square metre.`),
    section('Past calamity example',`${data.calamity_history.example}: ${data.calamity_history.status.replaceAll('_',' ')}.`),
    section('Data notice',data.notice)
  );
} catch {
  target.textContent='The fictional property example is unavailable. No verified external property data is connected.';
}
