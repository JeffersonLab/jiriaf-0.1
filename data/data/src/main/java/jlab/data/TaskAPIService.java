package jlab.data;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.PathVariable;

@RestController
@RequestMapping("/forminfo")
public class TaskAPIService {
	FormInfo formInfo;
		//formId, and everything else
	
	@GetMapping("/{accountName}")
	public FormInfo getFormInfo(@PathVariable String accountName) {
		return formInfo;
	}
	
	@PostMapping
	public String createTaskDetails(@RequestBody FormInfo formInfo) {
		System.out.println("Preliminary");
		this.formInfo = formInfo;
		System.out.println("created");
		return "Task Created Successfully";
		
	}
	
	@PutMapping 
	
	public String updateTaskDetails(@RequestBody FormInfo formInfo) {
		
		this.formInfo = formInfo;
		return "Task updated Successfully";
	}
	
@DeleteMapping("{formName}") 
	
	public String deleteTaskDetails(@RequestBody String formId) {
		
		this.formInfo = null;
		return "Task deleted Successfully";
	}
	

	

}
